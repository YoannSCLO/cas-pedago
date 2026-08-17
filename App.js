import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
  LayoutAnimation,
  UIManager,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";

// Le date picker natif n'existe pas en web : import conditionnel
let DateTimePicker = null;
if (Platform.OS !== "web") {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ————— Tokens —————
const C = {
  navy: "#1F3864",
  blue: "#2E75B6",
  teal: "#1B8A7A",
  amber: "#B45309",
  bg: "#F5F7FA",
  ink: "#1A2233",
  mut: "#64748B",
  line: "#E2E8F0",
  white: "#FFFFFF",
  red: "#B42318",
};

const STORAGE_KEY = "cas-pedago-v1";
const NIVEAUX = ["Débutant", "Intermédiaire", "Expert"];
const NIVEAU_COLORS = { Débutant: C.teal, Intermédiaire: C.blue, Expert: C.amber };
const SPECIALITES = ["Neuro", "ORL", "Ophtalmo", "Ostéo", "Autre"];

const emptyForm = () => ({
  nom: "",
  date: new Date().toISOString().slice(0, 10),
  ipp: "",
  signes: "",
  niveau: "",
  specialite: "",
});

const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// ————— Composants —————
const Chip = ({ label, active, color, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      st.chip,
      { borderColor: active ? color : C.line, backgroundColor: active ? color : C.white },
    ]}
  >
    <Text style={[st.chipTxt, { color: active ? C.white : color }]}>{label}</Text>
  </TouchableOpacity>
);

const Badge = ({ label, bg, fg, border }) => (
  <View style={[st.badge, { backgroundColor: bg, borderColor: border || bg }]}>
    <Text style={[st.badgeTxt, { color: fg }]}>{label}</Text>
  </View>
);

export default function App() {
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // ————— Persistance —————
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setCases(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback(async (next) => {
    setCases(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // ————— Actions —————
  const resetForm = () => {
    setForm(emptyForm());
    setEditId(null);
  };

  const saveCase = async () => {
    if (!form.nom.trim() && !form.ipp.trim()) {
      Alert.alert("Champ manquant", "Renseignez au moins le nom ou l'IPP.");
      return;
    }
    LayoutAnimation.easeInEaseOut();
    if (editId) {
      await persist(cases.map((c) => (c.id === editId ? { ...c, ...form } : c)));
    } else {
      await persist([{ id: Date.now().toString(36), ...form }, ...cases]);
    }
    resetForm();
  };

  const startEdit = (c) => {
    setForm({
      nom: c.nom,
      date: c.date,
      ipp: c.ipp,
      signes: c.signes,
      niveau: c.niveau || "",
      specialite: c.specialite || "",
    });
    setEditId(c.id);
    setFormOpen(true);
  };

  const askDelete = (c) =>
    Alert.alert("Supprimer ce cas ?", c.nom || `IPP ${c.ipp}`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          LayoutAnimation.easeInEaseOut();
          await persist(cases.filter((x) => x.id !== c.id));
          if (editId === c.id) resetForm();
        },
      },
    ]);

  const exportCSV = async () => {
    if (!cases.length) return;
    const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
    const csv = [
      ["Nom", "Date examen", "IPP", "Spécialité", "Niveau", "Signes clés"].join(";"),
      ...cases.map((c) =>
        [esc(c.nom), esc(fmtDate(c.date)), esc(c.ipp), esc(c.specialite), esc(c.niveau), esc(c.signes)].join(";")
      ),
    ].join("\n");
    await Clipboard.setStringAsync(csv);
    Share.share({ message: csv }).catch(() => {});
  };

  // ————— Filtrage —————
  const q = search.trim().toLowerCase();
  const filtered = q
    ? cases.filter((c) =>
        [c.nom, c.ipp, c.signes, c.niveau, c.specialite, fmtDate(c.date)]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : cases;

  // ————— Rendu carte —————
  const renderCase = ({ item: c }) => (
    <View style={[st.card, { borderLeftColor: NIVEAU_COLORS[c.niveau] || C.teal }]}>
      <View style={st.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={st.cardName}>{c.nom || "Sans nom"}</Text>
          <View style={st.badgeRow}>
            <Text style={st.cardDate}>{fmtDate(c.date)}</Text>
            {!!c.ipp && <Badge label={`IPP ${c.ipp}`} bg="#EAF0F8" fg={C.navy} />}
            {!!c.specialite && <Badge label={c.specialite} bg={C.bg} fg={C.navy} border={C.line} />}
            {!!c.niveau && <Badge label={c.niveau} bg={NIVEAU_COLORS[c.niveau]} fg={C.white} />}
          </View>
        </View>
        <View style={st.cardActions}>
          <TouchableOpacity onPress={() => startEdit(c)} hitSlop={8}>
            <Text style={[st.actionTxt, { color: C.blue }]}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => askDelete(c)} hitSlop={8}>
            <Text style={[st.actionTxt, { color: C.red }]}>Suppr.</Text>
          </TouchableOpacity>
        </View>
      </View>
      {!!c.signes && <Text style={st.cardSignes}>{c.signes}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={st.header}>
        <Text style={st.headerTitle}>Cas pédagogiques</Text>
        <View style={st.headerCount}>
          <Text style={st.headerCountTxt}>{cases.length} cas</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderCase}
          contentContainerStyle={st.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* ————— Formulaire ————— */}
              <View style={st.formCard}>
                <TouchableOpacity
                  style={st.formToggle}
                  onPress={() => {
                    LayoutAnimation.easeInEaseOut();
                    setFormOpen(!formOpen);
                  }}
                >
                  <Text style={[st.formToggleTxt, { color: editId ? C.amber : C.teal }]}>
                    {editId ? "Modifier le cas" : "Nouveau cas"}
                  </Text>
                  <Text style={{ color: C.mut }}>{formOpen ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {formOpen && (
                  <View style={st.formBody}>
                    <Text style={st.label}>Nom du patient</Text>
                    <TextInput
                      style={st.input}
                      value={form.nom}
                      onChangeText={(v) => setForm({ ...form, nom: v })}
                      placeholder="Nom Prénom"
                      placeholderTextColor={C.mut}
                      autoCapitalize="words"
                    />

                    <View style={st.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.label}>Date d'examen</Text>
                        {Platform.OS === "web" ? (
                          React.createElement("input", {
                            type: "date",
                            value: form.date,
                            onChange: (e) => setForm({ ...form, date: e.target.value }),
                            style: {
                              boxSizing: "border-box",
                              width: "100%",
                              border: "1.5px solid #E2E8F0",
                              borderRadius: 10,
                              padding: "11px 13px",
                              fontSize: 16,
                              color: "#1A2233",
                              backgroundColor: "#FFFFFF",
                              fontFamily: "inherit",
                            },
                          })
                        ) : (
                          <TouchableOpacity style={st.input} onPress={() => setShowPicker(true)}>
                            <Text style={{ fontSize: 16, color: C.ink }}>{fmtDate(form.date)}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.label}>IPP</Text>
                        <TextInput
                          style={[st.input, st.mono]}
                          value={form.ipp}
                          onChangeText={(v) => setForm({ ...form, ipp: v })}
                          placeholder="N° IPP"
                          placeholderTextColor={C.mut}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>

                    {showPicker && DateTimePicker && (
                      <DateTimePicker
                        value={new Date(form.date + "T12:00:00")}
                        mode="date"
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        onChange={(e, d) => {
                          setShowPicker(Platform.OS === "ios");
                          if (d) setForm({ ...form, date: d.toISOString().slice(0, 10) });
                          if (Platform.OS === "ios") setShowPicker(false);
                        }}
                      />
                    )}

                    <Text style={st.label}>Spécialité</Text>
                    <View style={st.chipRow}>
                      {SPECIALITES.map((s) => (
                        <Chip
                          key={s}
                          label={s}
                          color={C.navy}
                          active={form.specialite === s}
                          onPress={() =>
                            setForm({ ...form, specialite: form.specialite === s ? "" : s })
                          }
                        />
                      ))}
                    </View>

                    <Text style={st.label}>Niveau</Text>
                    <View style={st.chipRow}>
                      {NIVEAUX.map((n) => (
                        <Chip
                          key={n}
                          label={n}
                          color={NIVEAU_COLORS[n]}
                          active={form.niveau === n}
                          onPress={() => setForm({ ...form, niveau: form.niveau === n ? "" : n })}
                        />
                      ))}
                    </View>

                    <Text style={st.label}>Signes clés</Text>
                    <TextInput
                      style={[st.input, st.textarea]}
                      value={form.signes}
                      onChangeText={(v) => setForm({ ...form, signes: v })}
                      placeholder="Sémiologie, séquences clés, diagnostic…"
                      placeholderTextColor={C.mut}
                      multiline
                    />

                    <View style={st.row}>
                      <TouchableOpacity
                        style={[st.saveBtn, { backgroundColor: editId ? C.amber : C.blue }]}
                        onPress={saveCase}
                      >
                        <Text style={st.saveBtnTxt}>
                          {editId ? "Mettre à jour" : "Enregistrer le cas"}
                        </Text>
                      </TouchableOpacity>
                      {editId && (
                        <TouchableOpacity style={st.cancelBtn} onPress={resetForm}>
                          <Text style={st.cancelBtnTxt}>Annuler</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* ————— Recherche + export ————— */}
              {cases.length > 0 && (
                <View style={[st.row, { marginBottom: 12 }]}>
                  <TextInput
                    style={[st.input, { flex: 1 }]}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Rechercher (nom, IPP, signes…)"
                    placeholderTextColor={C.mut}
                    clearButtonMode="while-editing"
                  />
                  <TouchableOpacity style={st.exportBtn} onPress={exportCSV}>
                    <Text style={st.exportBtnTxt}>Exporter</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <Text style={st.empty}>
              {cases.length === 0
                ? "Aucun cas pour l'instant. Saisissez votre premier cas ci-dessus."
                : "Aucun cas ne correspond à cette recherche."}
            </Text>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ————— Styles —————
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy },
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: C.white, fontSize: 19, fontWeight: "800" },
  headerCount: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  headerCountTxt: { color: C.white, fontSize: 12, fontWeight: "700" },
  listContent: { backgroundColor: C.bg, padding: 14, paddingBottom: 60, flexGrow: 1 },
  formCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 16,
    overflow: "hidden",
  },
  formToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  formToggleTxt: { fontSize: 14, fontWeight: "800" },
  formBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 4 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.mut,
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.white,
    justifyContent: "center",
  },
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  textarea: { minHeight: 84, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipTxt: { fontSize: 13.5, fontWeight: "700" },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnTxt: { color: C.white, fontSize: 15, fontWeight: "800" },
  cancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    marginTop: 12,
  },
  cancelBtnTxt: { color: C.mut, fontSize: 14, fontWeight: "700" },
  exportBtn: {
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.teal,
    backgroundColor: C.white,
    justifyContent: "center",
  },
  exportBtnTxt: { color: C.teal, fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    borderLeftWidth: 4,
    padding: 13,
    marginBottom: 10,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardName: { fontSize: 15.5, fontWeight: "800", color: C.ink },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5, alignItems: "center" },
  cardDate: { fontSize: 12.5, color: C.mut, fontWeight: "600" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeTxt: { fontSize: 11.5, fontWeight: "800" },
  cardActions: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  actionTxt: { fontSize: 12.5, fontWeight: "700" },
  cardSignes: { marginTop: 8, fontSize: 14, lineHeight: 20, color: C.ink },
  empty: { textAlign: "center", color: C.mut, fontSize: 14, paddingVertical: 36, lineHeight: 21 },
});
