import { getCurrentUser } from '@/data/auth';
import { UserMenuDropdown } from './user-menu-dropdown';

/** Reads the session, so it must render inside a <Suspense> boundary. */
export async function UserMenu() {
  const { name, email } = await getCurrentUser();
  return <UserMenuDropdown user={{ name, email }} />;
}
