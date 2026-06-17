import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  style?: object;
}

export function FormField({ label, children, style }: FormFieldProps) {
  const colors = useColors();
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.label, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14 },
});
