import { Session, User } from '@/lib/types'; // Ensure the User type includes all necessary fields
import { getUser } from '../app/login/actions'; // Import the getUser function
import { useEffect, useState } from 'react'; // Import useEffect and useState

export interface EmptyScreenProps {
  user?: Session['user']; // Make user optional
}

export function EmptyScreen({ user }: EmptyScreenProps) {
  const [fetchedUser, setFetchedUser] = useState<User | null>(null); // State to hold fetched user

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.email) {
        const fetchedData = await getUser(user.email); // Fetch user data
        setFetchedUser(fetchedData); // Set the fetched user data
      }
    };

    fetchUserData();
  }, [user]);

  return (
    <div className="fixed inset-0 flex justify-center items-center">
      <div className="mx-auto max-w-2xl px-4 -mt-32">
        <div className="flex flex-col gap-2 sm:p-8 p-4 text-sm sm:text-base">
          <h1
            className="text-4xl sm:text-5xl tracking-tight font-semibold whitespace-nowrap
                       bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text"
          >
            Hello, {fetchedUser?.firstName || 'Guest'} 
          </h1>
        </div>
      </div>
    </div>
  );
}
