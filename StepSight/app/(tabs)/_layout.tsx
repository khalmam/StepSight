import { Tabs } from 'expo-router';
import { Camera, Settings, BookOpen } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
          tabBarIcon: ({ size, color }) => (
            <Camera size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Camera navigation screen',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Settings and calibration screen',
        }}
      />
      <Tabs.Screen
        name="tutorial"
        options={{
          title: 'Tutorial',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Tutorial and help screen',
        }}
      />
    </Tabs>
  );
}