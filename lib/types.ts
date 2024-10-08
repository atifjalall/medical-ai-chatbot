import { Message } from 'ai'

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: Message[]
  sharePath?: string
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

export interface Session {
  user: {
    id: string
    email: string
  }
}

export interface AuthResult {
  type: string
  message: string
}

export interface User extends Record<string, any> {
  id: string
  email: string
  password: string
  salt: string
}

export interface User {
  id: string;        // The user's ID as a string
  email: string;     // The user's email address
  password: string;  // The user's password (optional for client-side usage)
  salt: string;      // The salt used for password hashing
  firstName: string; // The user's first name
  lastName: string;  // The user's last name
  dob: string;       // The user's date of birth (consider using Date type if you want to manipulate dates)
  gender: string;    // The user's gender
}

