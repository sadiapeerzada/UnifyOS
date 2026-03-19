import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
}

const DEMO_CONTACTS: Contact[] = [
  { id: "c-001", name: "Reception Desk", role: "Reception", phone: "+911234567890" },
  { id: "c-002", name: "Security Guard", role: "Security", phone: "+911234567891" },
  { id: "c-003", name: "Hotel Manager", role: "Manager", phone: "+911234567892" },
];

const CONTACTS_KEY = "emergency_contacts";

const ROLE_COLORS: Record<string, string> = {
  Reception: Colors.accent,
  Security: Colors.high,
  Manager: Colors.normal,
  Staff: Colors.medium,
  Other: Colors.textSecondary,
};

export default function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CONTACTS_KEY).then(raw => {
      if (raw) {
        try { setContacts(JSON.parse(raw)); } catch {}
      } else {
        setContacts(DEMO_CONTACTS);
        AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(DEMO_CONTACTS));
      }
    });
  }, []);

  function saveContacts(updated: Contact[]) {
    setContacts(updated);
    AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
  }

  function handleAdd() {
    if (!name.trim() || !phone.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const contact: Contact = {
      id: Date.now().toString(),
      name: name.trim(),
      role: role.trim() || "Staff",
      phone: phone.trim(),
    };
    saveContacts([...contacts, contact]);
    setName("");
    setRole("");
    setPhone("");
    setAdding(false);
  }

  function handleRemove(id: string) {
    Alert.alert("Remove Contact", "Remove this emergency contact?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          saveContacts(contacts.filter(c => c.id !== id));
        },
      },
    ]);
  }

  function handleCall(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  const roleColor = (r: string) => ROLE_COLORS[r] || Colors.textSecondary;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Emergency Contacts</Text>
          <Text style={styles.subtitle}>Notified automatically on CRITICAL alerts</Text>
        </View>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setAdding(v => !v); }}
          style={styles.addBtn}
        >
          <Feather name={adding ? "x" : "plus"} size={16} color={Colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {adding && (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>Add New Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Contact name"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Role (e.g. Reception, Security)"
              placeholderTextColor={Colors.textMuted}
              value={role}
              onChangeText={setRole}
            />
            <TextInput
              style={styles.input}
              placeholder="+91 XXXXXXXXXX"
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Pressable
              onPress={handleAdd}
              style={[styles.addContactBtn, (!name.trim() || !phone.trim()) && styles.addContactBtnDisabled]}
              disabled={!name.trim() || !phone.trim()}
            >
              <Feather name="user-plus" size={14} color="#fff" />
              <Text style={styles.addContactBtnText}>Add Contact</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.sectionLabel}>
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""} registered
        </Text>

        {contacts.map(contact => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={[styles.contactIcon, { backgroundColor: roleColor(contact.role) + "20" }]}>
              <MaterialCommunityIcons name="account" size={22} color={roleColor(contact.role)} />
            </View>
            <View style={styles.contactInfo}>
              <View style={styles.contactNameRow}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: roleColor(contact.role) + "20" }]}>
                  <Text style={[styles.roleText, { color: roleColor(contact.role) }]}>{contact.role}</Text>
                </View>
              </View>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
            <View style={styles.contactActions}>
              <Pressable
                onPress={() => handleCall(contact.phone)}
                style={styles.callBtn}
                accessibilityLabel={`Call ${contact.name}`}
              >
                <Feather name="phone" size={14} color="#fff" />
                <Text style={styles.callBtnText}>Call</Text>
              </Pressable>
              <Pressable
                onPress={() => handleRemove(contact.id)}
                style={styles.removeBtn}
                hitSlop={8}
              >
                <Feather name="x" size={14} color={Colors.critical} />
              </Pressable>
            </View>
          </View>
        ))}

        {contacts.length === 0 && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-group" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No contacts yet</Text>
            <Text style={styles.emptyText}>Tap + to add emergency contacts</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="rocket-launch" size={18} color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Enterprise Phase 2</Text>
            <Text style={styles.infoText}>
              Auto-SMS all contacts when a CRITICAL alert fires. Integration with hotel management systems coming soon.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accent + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  addForm: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accentGlow,
    padding: 16,
    gap: 10,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  addContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 2,
  },
  addContactBtnDisabled: { backgroundColor: Colors.border },
  addContactBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contactInfo: { flex: 1, gap: 4 },
  contactNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  contactPhone: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  contactActions: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.normal,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  callBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.criticalBg,
    borderWidth: 1,
    borderColor: Colors.criticalBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptyText: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.accentGlow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.accent + "30",
    padding: 14,
    marginTop: 10,
    alignItems: "flex-start",
  },
  infoTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accent, marginBottom: 3 },
  infoText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 16 },
});
