import { Stack } from 'expo-router';

export default function GroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F0E8' },
      }}
    />
  );
}
