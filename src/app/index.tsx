import { Redirect } from "expo-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import {
  Button,
  Card,
  Copy,
  ErrorText,
  Form,
  Loading,
  Screen,
  options,
  Row,
  type Field,
} from "@/components/mobile-ui";

export default function Entry() {
  const session = useSession();
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  if (session.loading)
    return (
      <Screen title="Welcome home">
        <Loading />
      </Screen>
    );
  if (session.startupError)
    return (
      <Screen title="Let’s reconnect">
        <ErrorText error={session.startupError} />
        <Button
          label="Retry connection"
          onPress={() => void session.refresh()}
        />
        <Button
          secondary
          label="Return to sign in"
          onPress={() => void session.clear()}
        />
      </Screen>
    );
  if (session.user) return <Redirect href="/workspace/home" />;
  const fields: Field[] = [
    ...(mode === "register"
      ? [{ name: "name", required: true, max: 255 }]
      : []),
    { name: "email", type: "email", required: true, max: 255 },
    ...(mode === "reset-password"
      ? [
          {
            name: "token",
            label: "Reset token from email link",
            required: true,
          },
        ]
      : []),
    ...(mode !== "forgot-password"
      ? [{ name: "password", type: "password" as const, required: true }]
      : []),
    ...(mode === "register" || mode === "reset-password"
      ? [
          {
            name: "password_confirmation",
            type: "password" as const,
            required: true,
          },
        ]
      : []),
    ...(mode === "register"
      ? [
          {
            name: "roles",
            label: "I’m here to",
            type: "multi" as const,
            required: true,
            options: options(["finder", "owner"]),
          },
        ]
      : []),
  ];
  return (
    <Screen
      title={
        mode === "login"
          ? "Find a place to belong."
          : mode === "register"
            ? "Your next chapter starts here."
            : "Find your way back."
      }
      subtitle="Thoughtful spaces. Welcoming people. Room for you."
    >
      <Card>
        <Copy title>
          {mode === "login"
            ? "Welcome back"
            : mode === "register"
              ? "Create your account"
              : "Password recovery"}
        </Copy>
        {!!message && <Copy>{message}</Copy>}
        <Form
          key={mode}
          fields={fields}
          initial={{ roles: ["finder"] }}
          label={
            mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : "Continue"
          }
          submit={async (values) => {
            if (mode === "login" || mode === "register")
              await session.authenticate(`/auth/${mode}`, values);
            else {
              const result = await api<{ message: string }>(
                `/auth/${mode}`,
                "POST",
                values,
              );
              setMessage(result.message);
              if (mode === "reset-password") setMode("login");
            }
          }}
        />
        {mode === "register" && (
          <Copy muted>
            Use a strong password. Production requires at least 12 characters
            with upper and lower case, numbers, and symbols. Check your email
            after registering.
          </Copy>
        )}
      </Card>
      <Row>
        {["login", "register", "forgot-password", "reset-password"]
          .filter((item) => item !== mode)
          .map((item) => (
            <Button
              secondary
              key={item}
              label={
                {
                  login: "Sign in",
                  register: "Create account",
                  "forgot-password": "Forgot password",
                  "reset-password": "Have a reset token?",
                }[item]!
              }
              onPress={() => {
                setMode(item);
                setMessage("");
              }}
            />
          ))}
      </Row>
    </Screen>
  );
}
