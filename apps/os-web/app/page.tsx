import { redirect } from 'next/navigation';
import { DEFAULT_POST_LOGIN } from '@/lib/auth/constants';

export default function HomePage() {
  redirect(DEFAULT_POST_LOGIN);
}
