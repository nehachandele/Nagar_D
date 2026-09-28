import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { setAuthToken, userService } from '../api/client';

interface ProfileScreenProps {
  user: any;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user: initialUser, onLogout }) => {
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(false);

  // Edit Profile Modal State
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(currentUser?.full_name || '');
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone_number || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password Modal State
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          setAuthToken(null);
          onLogout();
        },
      },
    ]);
  };

  const openEditProfile = () => {
    setFullNameInput(currentUser?.full_name || '');
    setPhoneInput(currentUser?.phone_number || '');
    setEditProfileVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!fullNameInput.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    try {
      setSavingProfile(true);
      const updated = await userService.updateProfile({
        full_name: fullNameInput.trim(),
        phone_number: phoneInput.trim() || undefined,
      });
      setCurrentUser(updated);
      setEditProfileVisible(false);
      Alert.alert('Profile Updated', 'Your profile details have been successfully saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordVisible(true);
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }
    try {
      setSavingPassword(true);
      await userService.changePassword(currentPassword, newPassword);
      setChangePasswordVisible(false);
      Alert.alert('Password Changed', 'Your password has been successfully updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'C'}
          </Text>
        </View>
        <Text style={styles.name}>{currentUser?.full_name || 'Citizen User'}</Text>
        <Text style={styles.email}>{currentUser?.email || 'citizen@example.com'}</Text>
        {currentUser?.phone_number ? (
          <Text style={styles.phoneText}>📞 {currentUser.phone_number}</Text>
        ) : null}

        <View style={styles.roleBadge}>
          <MaterialCommunityIcons name="shield-account" size={14} color={COLORS.primary} />
          <Text style={styles.roleText}>{currentUser?.role?.toUpperCase() || 'CITIZEN'}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.profileButtonsRow}>
          <TouchableOpacity style={styles.profileActionBtn} onPress={openEditProfile}>
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={styles.profileActionBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileActionBtn} onPress={openChangePassword}>
            <Ionicons name="key-outline" size={16} color={COLORS.primary} />
            <Text style={styles.profileActionBtnText}>Change Password</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Municipal Ward Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Municipal Corporation Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Jurisdiction</Text>
          <Text style={styles.infoVal}>Pune Municipal Corporation (PMC)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ward Circle</Text>
          <Text style={styles.infoVal}>Ward 14 - Central Division</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Emergency Helpline</Text>
          <Text style={[styles.infoVal, { color: COLORS.primary, fontWeight: '800' }]}>1800-103-0222</Text>
        </View>
      </View>

      {/* Notifications Preferences */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Notification Alerts</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelBox}>
            <Text style={styles.switchLabel}>Complaint Status Updates</Text>
            <Text style={styles.switchSub}>Push alert when officer updates status or resolves issue</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#CBD5E1', true: COLORS.primaryLight }}
            thumbColor={notificationsEnabled ? COLORS.primary : '#F1F5F9'}
          />
        </View>

        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 12 }]}>
          <View style={styles.switchLabelBox}>
            <Text style={styles.switchLabel}>SMS Notification</Text>
            <Text style={styles.switchSub}>Receive summary SMS upon complaint closure</Text>
          </View>
          <Switch
            value={smsAlertsEnabled}
            onValueChange={setSmsAlertsEnabled}
            trackColor={{ false: '#CBD5E1', true: COLORS.primaryLight }}
            thumbColor={smsAlertsEnabled ? COLORS.primary : '#F1F5F9'}
          />
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutBtnText}>Sign Out from Nagar Drishti</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={editProfileVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Citizen Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={fullNameInput}
              onChangeText={setFullNameInput}
              placeholder="Full Name"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="+91 9876543210"
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditProfileVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={changePasswordVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setChangePasswordVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setChangePasswordVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSavePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  email: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelBox: {
    flex: 1,
    paddingRight: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  switchSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  phoneText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  profileButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
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
