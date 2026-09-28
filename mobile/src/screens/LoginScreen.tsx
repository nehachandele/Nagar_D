import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { authService, initApiClient, updateApiBaseUrl, getCurrentApiBaseUrl } from '../api/client';

interface LoginScreenProps {
  navigation: any;
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, onLoginSuccess }) => {
  const [email, setEmail] = useState('citizen@example.com');
  const [password, setPassword] = useState('Citizen@123');
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [activeServerUrl, setActiveServerUrl] = useState('');

  useEffect(() => {
    initApiClient().then((url) => {
      setActiveServerUrl(url);
      setServerUrlInput(url);
    });
  }, []);

  const handleSaveServerUrl = async (urlToSave?: string) => {
    const target = urlToSave || serverUrlInput;
    if (!target || target.trim().length === 0) {
      Alert.alert('Invalid URL', 'Please enter a valid backend server URL.');
      return;
    }
    try {
      const updated = await updateApiBaseUrl(target);
      setActiveServerUrl(updated);
      setServerUrlInput(updated);
      Alert.alert('Server Config Saved', `Backend API URL updated to:\n${updated}`);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update server URL: ' + e.message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      const data = await authService.login(email.trim(), password);
      onLoginSuccess(data);
    } catch (err: any) {
      const msg = err.message || 'Invalid credentials or server unavailable.';
      if (msg.includes('Network Error')) {
        Alert.alert(
          'Connection Failed',
          `${msg}\n\nMake sure your mobile phone and backend server are on the same Wi-Fi network, and that backend is running on host 0.0.0.0.`,
          [
            { text: 'Configure Server IP', onPress: () => setShowServerConfig(true) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'citizen' | 'officer') => {
    if (role === 'citizen') {
      setEmail('citizen@example.com');
      setPassword('Citizen@123');
    } else {
      setEmail('officer.roads@nagardrishti.gov.in');
      setPassword('Officer@123');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="city-variant-outline" size={42} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>नगर दृष्टि</Text>
          <Text style={styles.subtitle}>Nagar Drishti • Civic Management Platform</Text>
          <Text style={styles.tagline}>Report civic defects. Powered by Vision AI & PostGIS.</Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. citizen@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Login to Citizen Portal</Text>
            )}
          </TouchableOpacity>

          {/* Demo account autofill buttons */}
          <View style={styles.demoRow}>
            <Text style={styles.demoLabel}>Demo Quick Fill:</Text>
            <TouchableOpacity onPress={() => fillDemo('citizen')} style={styles.demoPill}>
              <Text style={styles.demoPillText}>Citizen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => fillDemo('officer')} style={styles.demoPill}>
              <Text style={styles.demoPillText}>Officer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Endpoint Bar & Config Toggle */}
        <View style={styles.serverInfoCard}>
          <TouchableOpacity 
            style={styles.serverInfoHeader}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <View style={styles.serverInfoLeft}>
              <MaterialCommunityIcons name="server-network" size={16} color={COLORS.primary} />
              <Text style={styles.serverInfoText} numberOfLines={1}>
                API: {activeServerUrl || 'Loading...'}
              </Text>
            </View>
            <MaterialCommunityIcons 
              name={showServerConfig ? "chevron-up" : "cog-outline"} 
              size={18} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverConfigContent}>
              <Text style={styles.serverConfigLabel}>Backend Server URL / IP:</Text>
              <TextInput
                style={styles.serverInput}
                placeholder="e.g. http://192.168.1.15:8000/api/v1"
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.saveServerBtn}
                onPress={() => handleSaveServerUrl()}
              >
                <Text style={styles.saveServerBtnText}>Update Server Endpoint</Text>
              </TouchableOpacity>

              <Text style={styles.presetLabel}>Quick Presets:</Text>
              <View style={styles.presetRow}>
                <TouchableOpacity 
                  style={styles.presetPill}
                  onPress={() => handleSaveServerUrl('http://localhost:8000/api/v1')}
                >
                  <Text style={styles.presetPillText}>USB (localhost)</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.presetPill}
                  onPress={() => handleSaveServerUrl('http://192.168.1.9:8000/api/v1')}
                >
                  <Text style={styles.presetPillText}>Wi-Fi (192.168.1.9)</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.presetPill}
                  onPress={() => handleSaveServerUrl('http://10.0.2.2:8000/api/v1')}
                >
                  <Text style={styles.presetPillText}>Emulator</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Register footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New citizen? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Create Citizen Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  demoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  demoPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  demoPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  serverInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
    overflow: 'hidden',
  },
  serverInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  serverInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  serverInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  serverConfigContent: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  serverConfigLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
  },
  serverInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 10,
  },
  saveServerBtn: {
    backgroundColor: COLORS.secondary || '#3B82F6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveServerBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  presetPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.dark,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
