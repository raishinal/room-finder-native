import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ApiError, type Payload } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Page } from "@/lib/types";

export const light = {
  bg: "#fbf9f6",
  panel: "#fffefa",
  text: "#1c1b19",
  muted: "#78746f",
  border: "#e9e4de",
  accent: "#b65f43",
  soft: "#f7f0eb",
};
const dark = {
  bg: "#211c18",
  panel: "#2b241f",
  text: "#faf5ed",
  muted: "#bfb3a7",
  border: "#4b3d32",
  accent: "#df987b",
  soft: "#382c24",
};
export function usePalette() {
  return useSession().dark ? dark : light;
}
export function Copy({
  children,
  title,
  muted,
}: React.PropsWithChildren<{ title?: boolean; muted?: boolean }>) {
  const c = usePalette();
  return (
    <Text
      style={{
        color: muted ? c.muted : c.text,
        fontSize: title ? 26 : 15,
        fontFamily: title
          ? Platform.select({
              ios: "Georgia",
              android: "serif",
              web: "Georgia, serif",
            })
          : undefined,
        fontWeight: title ? "600" : "400",
        lineHeight: title ? 34 : 23,
      }}
    >
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  disabled,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? c.soft : c.accent,
        opacity: disabled || pressed ? 0.55 : 1,
      })}
    >
      <Text
        style={{
          color: secondary ? c.text : "#fff",
          fontWeight: "600",
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Row({ children }: React.PropsWithChildren) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
      }}
    >
      {children}
    </View>
  );
}
export function Card({ children }: React.PropsWithChildren) {
  const c = usePalette();
  return (
    <View
      style={{
        backgroundColor: c.panel,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 18,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}
export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <View accessibilityRole="alert">
      <Text style={{ color: "#b43d35", lineHeight: 22 }}>
        {error instanceof Error ? error.message : String(error)}
      </Text>
      {error instanceof ApiError &&
        Object.entries(error.errors).map(([key, messages]) => (
          <Text key={key} style={{ color: "#b43d35", lineHeight: 22 }}>
            {labelFor(key)}: {messages.join(" ")}
          </Text>
        ))}
    </View>
  );
}
export function Empty({
  text = "Nothing here yet. New activity will appear here.",
  children,
}: React.PropsWithChildren<{ text?: string }>) {
  return (
    <Card>
      <Copy title>A little room for what’s next</Copy>
      <Copy muted>{text}</Copy>
      {children}
    </Card>
  );
}
export function Screen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  footer,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
}>) {
  const c = usePalette();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            gap: 18,
            width: "100%",
            maxWidth: 760,
            alignSelf: "center",
            paddingBottom: 32,
          }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor={c.accent}
              />
            ) : undefined
          }
        >
          <Text
            style={{
              color: c.accent,
              letterSpacing: 3,
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            ROOM FINDER
          </Text>
          <Copy title>{title}</Copy>
          {subtitle && <Copy muted>{subtitle}</Copy>}
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Loading() {
  const c = usePalette();
  return (
    <View style={{ padding: 35 }}>
      <ActivityIndicator color={c.accent} accessibilityLabel="Loading" />
    </View>
  );
}
export function Pagination({
  meta,
  onPage,
}: {
  meta?: Page<unknown>["meta"];
  onPage: (page: number) => void;
}) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <Row>
      <Button
        secondary
        label="Previous"
        disabled={meta.current_page <= 1}
        onPress={() => onPage(meta.current_page - 1)}
      />
      <Copy muted>
        {meta.current_page} / {meta.last_page}
      </Copy>
      <Button
        secondary
        label="Next"
        disabled={meta.current_page >= meta.last_page}
        onPress={() => onPage(meta.current_page + 1)}
      />
    </Row>
  );
}
export function Photo({
  uri,
  large = false,
}: {
  uri?: string | null;
  large?: boolean;
}) {
  const c = usePalette();
  return uri ? (
    <Image
      accessibilityLabel="Property or member photo"
      source={{ uri }}
      style={{
        height: large ? 260 : 180,
        width: "100%",
        borderRadius: 14,
        backgroundColor: c.soft,
      }}
      resizeMode="cover"
    />
  ) : (
    <View
      style={{
        height: 130,
        backgroundColor: c.soft,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Copy muted>No photo added</Copy>
    </View>
  );
}
export function Gallery({ photos }: { photos: { id: number; url: string }[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <ScrollView horizontal contentContainerStyle={{ gap: 10 }}>
        {photos.map((photo) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open photo"
            key={photo.id}
            onPress={() => setSelected(photo.url)}
          >
            <Image
              source={{ uri: photo.url }}
              style={{ width: 220, height: 170, borderRadius: 12 }}
            />
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={!!selected} onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#1c1b19" }}>
          <Button label="Close photo" onPress={() => setSelected(null)} />
          {selected && (
            <Image
              source={{ uri: selected }}
              resizeMode="contain"
              style={{ flex: 1 }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}
export function labelFor(name: string) {
  return name.replaceAll("_", " ").replace(/^\w/, (s) => s.toUpperCase());
}
export type Field = {
  name: string;
  label?: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "multiline"
    | "select"
    | "multi"
    | "boolean"
    | "image"
    | "images";
  required?: boolean;
  options?: { value: string; label: string }[];
  max?: number;
  min?: number;
  hint?: string;
};
export function options(values: string[]) {
  return values.map((value) => ({ value, label: value ? labelFor(value) : "Any" }));
}
export type Values = Record<string, unknown>;
type Upload = { uri: string; name: string; type: string; file?: File };
export function Form({
  fields,
  initial = {},
  submit,
  label = "Save",
  destructive = false,
}: {
  fields: Field[];
  initial?: Values;
  submit: (values: Values, body: Payload) => Promise<void>;
  label?: string;
  destructive?: boolean;
}) {
  const c = usePalette();
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const update = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    setSuccess("");
  };
  const pick = async (field: Field) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: field.type === "images",
        selectionLimit: 12,
        quality: 0.9,
      });
      if (result.canceled) return;
      const uploads: Upload[] = result.assets.map((asset) => {
        if (
          (asset.fileSize ?? 0) >
            (field.name === "profile_picture" ? 2 : 4) * 1024 * 1024 ||
          asset.width > 4096 ||
          asset.height > 4096
        )
          throw new Error(
            "Images must be at most 4096 × 4096 pixels and within the displayed size limit.",
          );
        if (
          asset.mimeType &&
          !["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType)
        )
          throw new Error("Choose JPEG, PNG or WebP images.");
        return {
          uri: asset.uri,
          name: asset.fileName ?? "photo.jpg",
          type: asset.mimeType ?? "image/jpeg",
          file: asset.file,
        };
      });
      update(field.name, field.type === "images" ? uploads : uploads[0]);
    } catch (e) {
      setError(e);
    }
  };
  const send = async () => {
    setError(undefined);
    setSuccess("");
    const normalized: Values = {};
    for (const field of fields) {
      const value = values[field.name];
      if (
        field.required &&
        (value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && !value.length))
      ) {
        setError(
          new Error(`${field.label ?? labelFor(field.name)} is required.`),
        );
        return;
      }
      if (
        field.type === "number" &&
        value !== "" &&
        value !== undefined &&
        value !== null &&
        (!Number.isFinite(Number(value)) ||
          (field.min !== undefined && Number(value) < field.min) ||
          (field.max !== undefined && Number(value) > field.max))
      ) {
        setError(
          new Error(
            `${field.label ?? labelFor(field.name)} is outside its allowed range.`,
          ),
        );
        return;
      }
      if (
        field.type === "date" &&
        value &&
        !/^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ) {
        setError(new Error("Use YYYY-MM-DD for dates."));
        return;
      }
      if (
        field.type === "email" &&
        value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
      ) {
        setError(new Error("Enter a valid email address."));
        return;
      }
      if (field.type === "password" && !value && !field.required) continue;
      if (field.type === "image" || field.type === "images") {
        if (value) normalized[field.name] = value;
        continue;
      }
      normalized[field.name] =
        field.type === "number"
          ? value === "" || value == null
            ? null
            : Number(value)
          : field.type === "multi"
            ? (value ?? [])
            : field.type === "boolean"
              ? !!value
              : (value ?? null);
    }
    if (
      normalized.password_confirmation !== undefined &&
      normalized.password !== normalized.password_confirmation
    ) {
      setError(new Error("Password confirmation does not match."));
      return;
    }
    let body: Payload = normalized;
    if (
      fields.some(
        (field) =>
          ["image", "images"].includes(field.type ?? "") &&
          normalized[field.name],
      )
    ) {
      const form = new FormData();
      Object.entries(normalized).forEach(([key, value]) => {
        const field = fields.find((f) => f.name === key);
        if (field?.type === "image" || field?.type === "images") {
          const uploads = (
            field.type === "images" ? value : [value]
          ) as Upload[];
          uploads.forEach((upload) => {
            if (Platform.OS === "web" && upload.file)
              form.append(
                field.type === "images" ? `${key}[]` : key,
                upload.file,
              );
            else
              form.append(
                field.type === "images" ? `${key}[]` : key,
                upload as unknown as Blob,
              );
          });
        } else if (Array.isArray(value)) {
          value.forEach((item) => form.append(`${key}[]`, String(item)));
        } else
          form.append(
            key,
            typeof value === "boolean"
              ? value
                ? "1"
                : "0"
              : value == null
                ? ""
                : String(value),
          );
      });
      body = form;
    }
    setBusy(true);
    try {
      await submit(normalized, body);
      setSuccess("Saved successfully.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 16 }}>
      {fields.map((field) => {
        const value = values[field.name];
        const label = field.label ?? labelFor(field.name);
        return (
          <View key={field.name} style={{ gap: 7 }}>
            <Text style={{ color: c.text, fontWeight: "600" }}>
              {label}
              {field.required ? " *" : ""}
            </Text>
            {field.hint && <Copy muted>{field.hint}</Copy>}
            {field.type === "select" || field.type === "multi" ? (
              <Row>
                {field.options?.map((option) => {
                  const selected =
                    field.type === "multi"
                      ? ((value as string[] | undefined) ?? []).includes(
                          option.value,
                        )
                      : String(value ?? "") === option.value;
                  return (
                    <Pressable
                      accessibilityRole={field.type === "multi" ? "checkbox" : "radio"}
                      accessibilityState={{ checked: selected, disabled: busy }}
                      disabled={busy}
                      key={option.value}
                      onPress={() =>
                        update(
                          field.name,
                          field.type === "multi"
                            ? selected
                              ? (value as string[]).filter(
                                  (v) => v !== option.value,
                                )
                              : [...((value as string[]) ?? []), option.value]
                            : option.value,
                        )
                      }
                      style={{
                        minHeight: 44,
                        padding: 12,
                        backgroundColor: selected ? c.accent : c.soft,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: selected ? "#fff" : c.text }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </Row>
            ) : field.type === "boolean" ? (
              <Switch
                accessibilityLabel={label}
                disabled={busy}
                value={!!value}
                onValueChange={(v) => update(field.name, v)}
                trackColor={{ true: c.accent }}
              />
            ) : field.type === "image" || field.type === "images" ? (
              <>
                <Button
                  secondary
                  label={value ? "Change selected photos" : "Choose photo"}
                  disabled={busy}
                  onPress={() => void pick(field)}
                />
                {!!value && (
                  <>
                    <Copy muted>
                      {Array.isArray(value) ? value.length : 1} photo(s)
                      selected
                    </Copy>
                    <Button
                      secondary
                      label="Remove selection"
                      disabled={busy}
                      onPress={() => update(field.name, undefined)}
                    />
                  </>
                )}
              </>
            ) : (
              <TextInput
                accessibilityLabel={label}
                editable={!busy}
                value={value == null ? "" : String(value)}
                onChangeText={(v) => update(field.name, v)}
                secureTextEntry={field.type === "password"}
                autoCapitalize={
                  field.type === "email" || field.type === "password"
                    ? "none"
                    : "sentences"
                }
                autoCorrect={
                  field.type !== "password" && field.type !== "email"
                }
                keyboardType={
                  field.type === "email"
                    ? "email-address"
                    : field.type === "number"
                      ? "decimal-pad"
                      : "default"
                }
                multiline={field.type === "multiline"}
                maxLength={field.type === "number" ? undefined : field.max}
                placeholder={field.type === "date" ? "YYYY-MM-DD" : label}
                placeholderTextColor={c.muted}
                style={{
                  minHeight: field.type === "multiline" ? 110 : 50,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 10,
                  padding: 13,
                  color: c.text,
                  backgroundColor: c.panel,
                  textAlignVertical: "top",
                }}
              />
            )}
          </View>
        );
      })}
      <ErrorText error={error} />
      {!!success && <Copy>{success}</Copy>}
      {busy && <Loading />}
      {destructive && (
        <Copy muted>
          This permanently deletes the account and cannot be undone.
        </Copy>
      )}
      <Button
        label={busy ? "Please wait…" : label}
        disabled={busy}
        onPress={() => void send()}
      />
    </View>
  );
}
export function Editor({
  title,
  children,
  onClose,
}: React.PropsWithChildren<{ title: string; onClose: () => void }>) {
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <Screen title={title}>
        <Button secondary label="Close" onPress={onClose} />
        {children}
      </Screen>
    </Modal>
  );
}
