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
  Modal,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
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

  // Forgot Password State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    initApiClient().then((url) => {
      setActiveServerUrl(url);
      setServerUrlInput(url);
    });
  }, []);

  const handleOpenForgotModal = () => {
    setForgotEmail(email);
    setForgotStep(1);
    setResetToken('');
    setResetNewPassword('');
    setForgotModalVisible(true);
  };

  const handleRequestResetToken = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Required', 'Please enter your account email.');
      return;
    }
    try {
      setResetLoading(true);
      const res = await authService.requestPasswordReset(forgotEmail.trim());
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
      setForgotStep(2);
      Alert.alert(
        'Reset Token Generated',
        res.reset_token
          ? `In demo/development mode, your reset token is:\n\n${res.reset_token}\n\nIt has been automatically filled for you.`
          : 'Please check your email for the reset instructions.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to request reset token.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetToken.trim() || !resetNewPassword.trim()) {
      Alert.alert('Required', 'Please enter both the reset token and new password.');
      return;
    }
    if (resetNewPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }
    try {
      setResetLoading(true);
      await authService.confirmPasswordReset(resetToken.trim(), resetNewPassword);
      setPassword(resetNewPassword);
      setEmail(forgotEmail.trim());
      setForgotModalVisible(false);
      Alert.alert('Success', 'Password has been reset successfully! You can now log in.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };


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
            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={handleOpenForgotModal}>
                <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
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

        {/* Forgot Password Modal */}
        <Modal visible={forgotModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Account Password</Text>
                <TouchableOpacity onPress={() => setForgotModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {forgotStep === 1 ? (
                <>
                  <Text style={styles.modalSub}>
                    Enter your registered email address to receive a secure password reset token.
                  </Text>
                  <Text style={styles.modalInputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="citizen@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setForgotModalVisible(false)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleRequestResetToken}
                      disabled={resetLoading}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.saveBtnText}>Get Reset Token</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.modalSub}>
                    Enter the reset token along with your desired new password.
                  </Text>

                  <Text style={styles.modalInputLabel}>Reset Token</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={resetToken}
                    onChangeText={setResetToken}
                    placeholder="Paste or enter reset token"
                    autoCapitalize="none"
                  />

                  <Text style={styles.modalInputLabel}>New Password</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={resetNewPassword}
                    onChangeText={setResetNewPassword}
                    placeholder="Min. 6 characters"
                    secureTextEntry
                  />

                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setForgotStep(1)}
                    >
                      <Text style={styles.cancelBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleConfirmReset}
                      disabled={resetLoading}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.saveBtnText}>Reset Password</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>


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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: '#F8FAFC',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});

