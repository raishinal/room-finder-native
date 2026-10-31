import { useState } from "react";
import { api, type Payload } from "@/lib/api";
import { useSession } from "@/lib/session";
import { profile, password } from "@/lib/forms";
import {
  Button,
  Card,
  Copy,
  Form,
  Photo,
  options,
  Row,
  type Values,
} from "./mobile-ui";

export async function saveForm(path: string, method: string, body: Payload) {
  if (body instanceof FormData && method !== "POST") {
    body.append("_method", method);
    return api(path, "POST", body);
  }
  return api(path, method, body);
}
export function AccountScreen() {
  const session = useSession();
  const user = session.user!;
  const [tab, setTab] = useState("profile");
  return (
    <>
      <Row>
        {["profile", "roles", "security", "appearance"]
          .filter(
            (item) =>
              user.email_verified_at || !["roles", "security"].includes(item),
          )
          .map((item) => (
            <Button
              secondary={tab !== item}
              key={item}
              label={item}
              onPress={() => setTab(item)}
            />
          ))}
      </Row>
      {tab === "profile" && (
        <Card>
          {user.profile_picture_url && <Photo uri={user.profile_picture_url} />}
          <Form
            key={`${user.id}-${user.email}`}
            fields={profile}
            initial={{ ...user }}
            submit={async (_, body) => {
              await saveForm("/user", "PATCH", body);
              await session.refresh();
            }}
          />
        </Card>
      )}
      {tab === "roles" && (
        <Card>
          <Copy>
            Choose how you use Room Finder. Existing administration memberships
            are preserved.
          </Copy>
          <Form
            fields={[
              {
                name: "roles",
                type: "multi",
                required: true,
                options: options(["owner", "finder"]),
              },
            ]}
            initial={{
              roles: user.roles.filter((r) => r === "owner" || r === "finder"),
            }}
            submit={async (values) => {
              await api("/user/roles", "PUT", values);
              await session.refresh();
            }}
          />
        </Card>
      )}
      {tab === "security" && (
        <>
          <Card>
            <Copy title>Change password</Copy>
            <Copy muted>
              Changing your password signs out every mobile device.
            </Copy>
            <Form
              fields={[
                { name: "current_password", type: "password", required: true },
                ...password,
              ]}
              submit={async (values) => {
                await api("/user/password", "PUT", values);
                await session.clear();
              }}
            />
          </Card>
          <Card>
            <Copy title>Delete account</Copy>
            <Form
              destructive
              fields={[
                {
                  name: "password",
                  label: "Confirm your current password",
                  type: "password",
                  required: true,
                },
                {
                  name: "confirmation",
                  label: "Type DELETE to confirm",
                  required: true,
                },
              ]}
              label="Permanently delete my account"
              submit={async (values) => {
                if (values.confirmation !== "DELETE")
                  throw new Error("Type DELETE to confirm permanent deletion.");
                await api("/user", "DELETE", { password: values.password });
                await session.clear();
              }}
            />
          </Card>
        </>
      )}
      {tab === "appearance" && (
        <Card>
          <Copy title>Appearance</Copy>
          <Row>
            <Button
              secondary={!session.dark}
              label="Dark"
              onPress={() => session.setDark(true)}
            />
            <Button
              secondary={session.dark}
              label="Light"
              onPress={() => session.setDark(false)}
            />
          </Row>
        </Card>
      )}
    </>
  );
}
export function filterValues(values: Values) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );
}
