import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "@/lib/api";
import { canAccess, useSession } from "@/lib/session";
import type { Workspace } from "@/lib/types";
import { AccountScreen } from "@/components/account-screen";
import {
  AdminOverview,
  NoticesScreen,
  UsersScreen,
} from "@/components/admin-screens";
import {
  CalendarScreen,
  InventoryScreen,
  OwnerOverview,
  PropertiesScreen,
} from "@/components/owner-screens";
import {
  ActivityScreen,
  Discovery,
  MessagesScreen,
  NotificationsScreen,
} from "@/components/rental-screens";
import {
  Button,
  Card,
  Copy,
  Form,
  Loading,
  Row,
  Screen,
  usePalette,
} from "@/components/mobile-ui";

const routes: Record<Workspace, [string, string][]> = {
  finder: [
    ["home", "Explore"],
    ["saved", "Saved places"],
    ["stays", "Stays & rentals"],
    ["messages", "Messages"],
    ["notifications", "Notifications"],
    ["notices", "Community notices"],
    ["account", "Account"],
  ],
  owner: [
    ["home", "Overview"],
    ["properties", "Properties"],
    ["listings", "Units & listings"],
    ["requests", "Requests"],
    ["bookings", "Bookings"],
    ["tenancies", "Tenancies"],
    ["calendar", "Calendar"],
    ["messages", "Messages"],
    ["notifications", "Notifications"],
    ["notices", "Community notices"],
    ["account", "Account"],
  ],
  admin: [
    ["home", "Administration"],
    ["users", "Members"],
    ["manage-notices", "Manage notices"],
    ["notices", "Community notices"],
    ["account", "Account"],
  ],
};
export default function WorkspaceRoute() {
  const { section = "home", conversation_id } = useLocalSearchParams<{
    section: string;
    conversation_id?: string;
  }>();
  const session = useSession();
  const c = usePalette();
  const [menu, setMenu] = useState(false);
  const [revision, setRevision] = useState(0);
  if (session.loading)
    return (
      <Screen title="Welcome home">
        <Loading />
      </Screen>
    );
  if (!session.user) return <Redirect href="/" />;
  const user = session.user;
  const workspace = session.workspace;
  if (!user.is_active || user.blocked_at)
    return (
      <Screen title="Account unavailable">
        <Copy>Please contact the administrator to restore access.</Copy>
        <Form fields={[]} label="Sign out" submit={session.logout} />
      </Screen>
    );
  if (!user.email_verified_at)
    return (
      <Screen
        title="Check your inbox"
        subtitle={`Open the exact verification link emailed to ${user.email}, then return here.`}
      >
        <Card>
          <Form
            fields={[]}
            label="I’ve verified my email · refresh"
            submit={session.refresh}
          />
          <Form
            fields={[]}
            label="Resend verification email"
            submit={async () => {
              await api("/auth/email/verification-notification", "POST");
            }}
          />
        </Card>
        <AccountScreen />
        <Form fields={[]} label="Sign out" submit={session.logout} />
      </Screen>
    );
  if (!canAccess(user, workspace)) return <Redirect href="/" />;
  const navigate = (next: string) => {
    setMenu(false);
    router.replace({
      pathname: "/workspace/[section]",
      params: { section: next },
    });
  };
  const valid = routes[workspace].some(([key]) => key === section);
  const title =
    routes[workspace].find(([key]) => key === section)?.[1] ??
    "Page unavailable";
  const bottom: [string, string][] =
    workspace === "finder"
      ? [
          ["home", "Explore"],
          ["saved", "Saved"],
          ["stays", "Stays"],
          ["messages", "Inbox"],
        ]
      : workspace === "owner"
        ? [
            ["home", "Overview"],
            ["properties", "Properties"],
            ["calendar", "Calendar"],
            ["requests", "Requests"],
          ]
        : [
            ["home", "Home"],
            ["users", "Members"],
            ["manage-notices", "Notices"],
            ["account", "Account"],
          ];
  const footer = (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        borderTopWidth: 1,
        borderColor: c.border,
        backgroundColor: c.panel,
      }}
    >
      {bottom.map(([key, label]) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: section === key }}
          key={key}
          onPress={() => navigate(key)}
          style={{
            minHeight: 58,
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: section === key ? c.accent : c.muted,
              fontWeight: "600",
              fontSize: 12,
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => setMenu(!menu)}
        style={{
          minHeight: 58,
          justifyContent: "center",
          paddingHorizontal: 6,
        }}
      >
        <Text style={{ color: c.text }}>More</Text>
      </Pressable>
    </View>
  );
  return (
    <Screen
      title={title}
      subtitle={`${workspace === "admin" ? "Administration" : workspace === "owner" ? "Host workspace" : "Find your next place"} · ${user.name}`}
      onRefresh={() => setRevision((v) => v + 1)}
      refreshing={false}
      footer={footer}
    >
      {menu && (
        <Card>
          <Copy title>Your workspace</Copy>
          <Row>
            {(["admin", "owner", "finder"] as Workspace[])
              .filter((w) => canAccess(user, w))
              .map((w) => (
                <Button
                  secondary={workspace !== w}
                  key={w}
                  label={
                    w === "admin"
                      ? "Administration"
                      : w === "owner"
                        ? "Hosting"
                        : "Finding"
                  }
                  onPress={() => {
                    session.setWorkspace(w);
                    navigate("home");
                  }}
                />
              ))}
          </Row>
          {routes[workspace].map(([key, label]) => (
            <Button
              key={key}
              secondary={key !== section}
              label={label}
              onPress={() => navigate(key)}
            />
          ))}
          <Form
            fields={[]}
            label="Sign out this device"
            submit={session.logout}
          />
        </Card>
      )}
      <View key={`${workspace}-${section}-${revision}`} style={{ gap: 18 }}>
        {!valid && (
          <Copy>
            You do not have access to this page in the current workspace.
          </Copy>
        )}
        {valid &&
          section === "home" &&
          (workspace === "finder" ? (
            <Discovery />
          ) : workspace === "owner" ? (
            <OwnerOverview />
          ) : (
            <AdminOverview />
          ))}
        {workspace === "finder" && section === "saved" && <Discovery saved />}
        {workspace === "owner" && section === "properties" && (
          <PropertiesScreen />
        )}
        {workspace === "owner" && section === "listings" && <InventoryScreen />}
        {workspace === "owner" && section === "calendar" && <CalendarScreen />}
        {((workspace === "owner" &&
          ["requests", "bookings", "tenancies"].includes(section)) ||
          (workspace === "finder" && section === "stays")) && (
          <ActivityScreen workspace={workspace} section={section} />
        )}
        {workspace !== "admin" && section === "messages" && (
          <MessagesScreen
            workspace={workspace}
            conversationId={conversation_id}
          />
        )}
        {workspace !== "admin" && section === "notifications" && (
          <NotificationsScreen workspace={workspace} />
        )}
        {section === "notices" && <NoticesScreen />}
        {workspace === "admin" && section === "manage-notices" && (
          <NoticesScreen management />
        )}
        {workspace === "admin" && section === "users" && <UsersScreen />}
        {section === "account" && <AccountScreen />}
      </View>
    </Screen>
  );
}
