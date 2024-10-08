'use server';

import { signIn } from '@/auth';
import { User } from '@/lib/types'; // Ensure this interface is properly defined
import { AuthError } from 'next-auth';
import { z } from 'zod';
import clientPromise from '@/lib/mongodb'; // Import your MongoDB client
import { ResultCode, getStringFromBuffer } from '@/lib/utils'; // Ensure these are correctly imported
import { ObjectId } from 'mongodb'; // Import ObjectId

// Function to get a user by email from MongoDB
export async function getUser(email: string): Promise<User | null> {
  try {
    const client = await clientPromise; // Get MongoDB client
    const db = client.db('medicalChatbotDB'); // Use your actual database name
    
    // Find the user by email
    const user = await db.collection('users').findOne({ email });

    // If the user is found, map the fields to the User type
    if (user) {
      return {
        id: user._id.toString(), // Convert ObjectId to string
        email: user.email,
        password: user.password, // You might want to exclude this for security
        salt: user.salt,
        firstName: user.firstName, // Add firstName
        lastName: user.lastName, // Add lastName
        dob: user.dob, // Add date of birth
        gender: user.gender, // Add gender
      } as User; // Cast to User type
    }

    return null; // Return null if user is not found
  } catch (error) {
    console.error('Error retrieving user:', error);
    return null; // Handle error gracefully
  }
}

// Function to create a new user in the database
export async function createUser(
  email: string,
  hashedPassword: string,
  salt: string,
  firstName: string,
  lastName: string,
  dob: string,
  gender: string
) {
  const user = await getUser(email); // Check if user already exists

  if (user) {
    return {
      type: 'error',
      resultCode: ResultCode.UserAlreadyExists
    };
  } else {
    // Define the user object with ObjectId for _id
    const newUser = {
      _id: new ObjectId(), // Use ObjectId for user ID
      email,
      password: hashedPassword,
      salt,
      firstName, // Store first name
      lastName, // Store last name
      dob, // Store date of birth
      gender // Store gender
    };

    const client = await clientPromise; // Get MongoDB client
    const db = client.db('medicalChatbotDB'); // Use your actual database name

    await db.collection('users').insertOne(newUser); // Insert the new user

    return {
      type: 'success',
      resultCode: ResultCode.UserCreated
    };
  }
}

interface Result {
  type: string;
  resultCode: ResultCode;
}

// Function to handle signup logic
export async function signup(
  _prevState: Result | undefined,
  formData: FormData
): Promise<Result | undefined> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string; // Get first name
  const lastName = formData.get('lastName') as string; // Get last name
  const dob = formData.get('dob') as string; // Get date of birth
  const gender = formData.get('gender') as string; // Get gender

  // Validate input
  const parsedCredentials = z
    .object({
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string().max(50), // Validate first name
      lastName: z.string().max(50), // Validate last name
      dob: z.string(), // Validate date of birth
      gender: z.string() // Validate gender
    })
    .safeParse({
      email,
      password,
      firstName,
      lastName,
      dob,
      gender
    });

  if (parsedCredentials.success) {
    const salt = crypto.randomUUID(); // Generate a salt

    const encoder = new TextEncoder();
    const saltedPassword = encoder.encode(password + salt);
    const hashedPasswordBuffer = await crypto.subtle.digest(
      'SHA-256',
      saltedPassword
    );
    const hashedPassword = getStringFromBuffer(hashedPasswordBuffer); // Convert buffer to string

    try {
      const result = await createUser(email, hashedPassword, salt, firstName, lastName, dob, gender); // Create the user

      if (result.resultCode === ResultCode.UserCreated) {
        await signIn('credentials', {
          email,
          password,
          redirect: false
        });
      }

      return result;
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return {
              type: 'error',
              resultCode: ResultCode.InvalidCredentials
            };
          default:
            return {
              type: 'error',
              resultCode: ResultCode.UnknownError
            };
        }
      } else {
        return {
          type: 'error',
          resultCode: ResultCode.UnknownError
        };
      }
    }
  } else {
    return {
      type: 'error',
      resultCode: ResultCode.InvalidCredentials
    };
  }
}
