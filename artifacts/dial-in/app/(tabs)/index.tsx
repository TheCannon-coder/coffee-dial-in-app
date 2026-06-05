import { Redirect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { View } from 'react-native';

export default function Entry() {
  const { isLoaded, email, anonId } = useUser();

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F5F0E8' }} />;
  }

  if (email || anonId) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/onboarding" />;
}
