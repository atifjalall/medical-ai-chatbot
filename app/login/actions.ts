'use server'

import { signIn } from '@/auth'
import { User } from '@/lib/types'
import { AuthError } from 'next-auth'
import { z } from 'zod'
import { kv } from '@vercel/kv'
import { ResultCode } from '@/lib/utils'


import clientPromise from '@/lib/mongodb'; // Import your MongoDB client
import { ObjectId } from 'mongodb'; // Import ObjectId to handle MongoDB IDs

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
        password: user.password,
        salt: user.salt,
        firstName: user.firstName,
      } as User; // Cast to User type
    }

    return null; // Return null if user is not found
  } catch (error) {
    console.error('Error retrieving user:', error);
    return null; // Handle error gracefully
  }
}


interface Result {
  type: string
  resultCode: ResultCode
}

export async function authenticate(
  _prevState: Result | undefined,
  formData: FormData
): Promise<Result | undefined> {
  try {
    const email = formData.get('email')
    const password = formData.get('password')

    const parsedCredentials = z
      .object({
        email: z.string().email(),
        password: z.string().min(6)
      })
      .safeParse({
        email,
        password
      })

    if (parsedCredentials.success) {
      await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      return {
        type: 'success',
        resultCode: ResultCode.UserLoggedIn
      }
    } else {
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            type: 'error',
            resultCode: ResultCode.InvalidCredentials
          }
        default:
          return {
            type: 'error',
            resultCode: ResultCode.UnknownError
          }
      }
    }
  }
}
