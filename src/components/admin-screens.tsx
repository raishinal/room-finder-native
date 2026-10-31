import { useState } from "react";
import { api, query } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { useSession } from "@/lib/session";
import { noticeFields, password, profile, select, text } from "@/lib/forms";
import type { Notice, Page, User } from "@/lib/types";
import {
  Button,
  Card,
  Copy,
  Editor,
  Empty,
  Form,
  Pagination,
  Photo,
  Row,
  options,
} from "./mobile-ui";
import { filterValues, saveForm } from "./account-screen";
import { ResourceState } from "./rental-screens";

export function AdminOverview() {
  const resource = useResource<{
    data: {
      role: string;
      modules: {
        key: string;
        title: string;
        description: string;
        status: string;
      }[];
    };
  }>("/admin/dashboard");
  return (
    <>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          <Copy>Workspace: {resource.data.data.role}</Copy>
          {resource.data.data.modules.map((module) => (
            <Card key={module.key}>
              <Copy title>{module.title}</Copy>
              <Copy>{module.description}</Copy>
              <Copy muted>{module.status}</Copy>
            </Card>
          ))}
        </>
      )}
    </>
  );
}
export function UsersScreen() {
  const session = useSession();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [detail, setDetail] = useState<User | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const resource = useResource<Page<User>>(
    `/admin/users${query({ ...filters, page })}`,
  );
  const roles = session.user!.roles.includes("superadmin")
    ? ["finder", "owner", "admin", "superadmin"]
    : ["finder", "owner"];
  return (
    <>
      <Row>
        <Button label="Create member" onPress={() => setEditing("new")} />
        <Button
          secondary
          label="Search members"
          onPress={() => setFilterOpen(!filterOpen)}
        />
      </Row>
      {filterOpen && (
        <Card>
          <Form
            fields={[
              text("search", false, 100),
              select("status", ["", "active", "inactive", "blocked"], false),
            ]}
            initial={filters}
            label="Search"
            submit={async (values) => {
              setFilters(filterValues(values));
              setPage(1);
              setFilterOpen(false);
            }}
          />
        </Card>
      )}
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          {!resource.data.data.length && <Empty />}
          {resource.data.data.map((user) => (
            <Card key={user.id}>
              <Copy title>{user.name}</Copy>
              <Copy>{user.email}</Copy>
              <Copy muted>
                {user.roles.join(" · ")} ·{" "}
                {user.is_active ? "Active" : "Inactive"}
                {user.blocked_at ? " · Blocked" : ""}
              </Copy>
              <Row>
                <Button
                  secondary
                  label="Member details"
                  onPress={() => setDetail(user)}
                />
                {user.can_manage && user.id !== session.user!.id && (
                  <Button
                    label="Edit member"
                    onPress={() => setEditing(user)}
                  />
                )}
              </Row>
            </Card>
          ))}
          <Pagination meta={resource.data.meta} onPage={setPage} />
        </>
      )}
      {editing && (
        <Editor
          title={editing === "new" ? "Create member" : "Edit member"}
          onClose={() => setEditing(null)}
        >
          <Form
            fields={[
              ...profile,
              ...password.map((field) => ({
                ...field,
                required: editing === "new",
              })),
              {
                name: "roles",
                type: "multi",
                required: true,
                options: options(roles),
              },
            ]}
            initial={editing === "new" ? { roles: ["finder"] } : { ...editing }}
            submit={async (_, body) => {
              await saveForm(
                `/admin/users${editing === "new" ? "" : `/${editing.id}`}`,
                editing === "new" ? "POST" : "PUT",
                body,
              );
              setEditing(null);
              resource.reload();
            }}
          />
        </Editor>
      )}
      {detail && (
        <Editor title={detail.name} onClose={() => setDetail(null)}>
          {detail.profile_picture_url && (
            <Photo uri={detail.profile_picture_url} />
          )}
          <Copy>{detail.email}</Copy>
          <Copy>{detail.roles.join(", ")}</Copy>
          <Copy muted>
            {[
              detail.address_line,
              detail.city,
              detail.state,
              detail.postal_code,
              detail.country,
              detail.dob,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Copy>
          <Copy muted>
            {detail.email_verified_at
              ? "Email verified"
              : "Awaiting email verification"}
          </Copy>
          {detail.can_manage && detail.id !== session.user!.id && (
            <>
              <Form
                fields={[
                  { name: "is_active", type: "boolean" },
                  { name: "blocked", type: "boolean" },
                ]}
                initial={{
                  is_active: detail.is_active,
                  blocked: !!detail.blocked_at,
                }}
                label="Update access"
                submit={async (values) => {
                  await api(
                    `/admin/users/${detail.id}/status`,
                    "PATCH",
                    values,
                  );
                  setDetail(null);
                  resource.reload();
                }}
              />
              {session.user!.roles.includes("superadmin") && (
                <Form
                  fields={[
                    {
                      name: "roles",
                      type: "multi",
                      required: true,
                      options: options(roles),
                    },
                  ]}
                  initial={{ roles: detail.roles }}
                  label="Replace memberships"
                  submit={async (values) => {
                    await api(`/users/${detail.id}/roles`, "PUT", values);
                    setDetail(null);
                    resource.reload();
                  }}
                />
              )}
              <Form
                fields={[
                  {
                    name: "confirmation",
                    label: "Type DELETE to permanently delete this member",
                    required: true,
                  },
                ]}
                label="Delete member"
                submit={async (values) => {
                  if (values.confirmation !== "DELETE")
                    throw new Error("Type DELETE to confirm.");
                  await api(`/admin/users/${detail.id}`, "DELETE");
                  setDetail(null);
                  resource.reload();
                }}
              />
            </>
          )}
        </Editor>
      )}
    </>
  );
}
export function NoticesScreen({
  management = false,
}: {
  management?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Notice | "new" | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const path = management ? "/admin/notices" : "/notices";
  const resource = useResource<Page<Notice>>(`${path}${query({ page })}`);
  return (
    <>
      {management && (
        <Button label="Create notice" onPress={() => setEditing("new")} />
      )}
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          {!resource.data.data.length && (
            <Empty text="Community announcements will appear here." />
          )}
          {resource.data.data.map((notice) => (
            <Card key={notice.id}>
              <Photo uri={notice.image_url} />
              <Copy title>{notice.title}</Copy>
              <Copy>{notice.description}</Copy>
              <Copy muted>
                Through {notice.expires_on} (UTC)
                {management && !notice.is_visible ? " · Expired" : ""}
              </Copy>
              {management && (
                <>
                  <Row>
                    <Button
                      label="Edit notice"
                      onPress={() => setEditing(notice)}
                    />
                    <Button
                      secondary
                      label="Delete notice"
                      onPress={() => setDeleting(notice.id)}
                    />
                  </Row>
                  {deleting === notice.id && (
                    <Form
                      fields={[]}
                      label="Confirm permanent deletion"
                      submit={async () => {
                        await api(`${path}/${notice.id}`, "DELETE");
                        setDeleting(null);
                        resource.reload();
                      }}
                    />
                  )}
                </>
              )}
            </Card>
          ))}
          <Pagination meta={resource.data.meta} onPage={setPage} />
        </>
      )}
      {editing && (
        <Editor
          title={editing === "new" ? "Create notice" : "Edit notice"}
          onClose={() => setEditing(null)}
        >
          <Form
            fields={noticeFields.map((field) =>
              field.name === "image"
                ? { ...field, required: editing === "new" }
                : field,
            )}
            initial={editing === "new" ? {} : { ...editing }}
            submit={async (_, body) => {
              await saveForm(
                `${path}${editing === "new" ? "" : `/${editing.id}`}`,
                editing === "new" ? "POST" : "PUT",
                body,
              );
              setEditing(null);
              resource.reload();
            }}
          />
        </Editor>
      )}
    </>
  );
}
