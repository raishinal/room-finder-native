import { router } from "expo-router";
import { useState } from "react";
import { api, money, query } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { date, discoveryFields, messageFields } from "@/lib/forms";
import type {
  Activity,
  Listing,
  Message,
  Notification,
  Page,
  Thread,
  Workspace,
} from "@/lib/types";
import {
  Button,
  Card,
  Copy,
  Empty,
  ErrorText,
  Form,
  Loading,
  Pagination,
  Photo,
  Row,
} from "./mobile-ui";
import { filterValues } from "./account-screen";
import { activityActions } from "@/lib/workflows";

export function ResourceState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  return (
    <>
      {loading && <Loading />}
      {!!error && (
        <Card>
          <ErrorText error={error} />
          <Button label="Try again" onPress={retry} />
        </Card>
      )}
    </>
  );
}
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Card>
      <Photo uri={listing.cover_photo_url} />
      <Copy muted>
        {listing.city} ·{" "}
        {listing.mode === "short_stay" ? "Short stay" : "Long-term rental"}
      </Copy>
      <Copy title>{listing.title}</Copy>
      <Copy>
        {money(listing.price_minor, listing.currency)} /{" "}
        {listing.mode === "short_stay" ? "night" : "month"}
      </Copy>
      <Copy muted>
        {listing.unit.capacity} people · {listing.unit.bedrooms} bedrooms
      </Copy>
      <Button
        label="View place"
        onPress={() =>
          router.push({ pathname: "/listing/[id]", params: { id: listing.id } })
        }
      />
    </Card>
  );
}
export function Discovery({ saved = false }: { saved?: boolean }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const resource = useResource<{
    listings: Page<Listing>;
    savedIds: number[];
    upcoming: Activity[];
  }>(`/finder/${saved ? "saved" : "listings"}${query({ ...filters, page })}`);
  return (
    <>
      <Button
        secondary
        label={showFilters ? "Close filters" : "Search & filter places"}
        onPress={() => setShowFilters(!showFilters)}
      />
      {showFilters && (
        <Card>
          <Form
            fields={discoveryFields}
            initial={{ currency: "NPR", ...filters }}
            label="Find places"
            submit={async (values) => {
              setFilters(filterValues(values));
              setPage(1);
              setShowFilters(false);
            }}
          />
          <Button
            secondary
            label="Clear filters"
            onPress={() => {
              setFilters({});
              setPage(1);
              setShowFilters(false);
            }}
          />
        </Card>
      )}
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          {!saved && resource.data.upcoming.length > 0 && (
            <Card>
              <Copy title>Coming up</Copy>
              {resource.data.upcoming.map((item) => (
                <Copy key={item.id}>
                  {item.title} · {item.starts_on} → {item.ends_on}
                </Copy>
              ))}
            </Card>
          )}
          {!resource.data.listings.data.length && (
            <Empty
              text={
                saved
                  ? "Save a place from its details to keep it here."
                  : "No places match these filters. Try different dates, city, or budget."
              }
            />
          )}
          {resource.data.listings.data.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
          <Pagination meta={resource.data.listings.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
function ActivityCard({
  record,
  workspace,
  reload,
}: {
  record: Activity;
  workspace: Workspace;
  reload: () => void;
}) {
  const [action, setAction] = useState("");
  const owner = workspace === "owner";
  const actions = activityActions(
    record,
    owner,
    new Date().toISOString().slice(0, 10),
  );
  return (
    <Card>
      <Copy muted>
        {record.city} · {record.unit_name} · {record.status}
      </Copy>
      <Copy title>{record.title}</Copy>
      <Copy>
        {record.starts_on} → {record.ends_on ?? "Open-ended"} · {record.people}{" "}
        people
      </Copy>
      {owner && <Copy>{record.finder_name}</Copy>}
      <Copy>
        {record.kind === "bookings"
          ? `${money(record.total_minor ?? 0, record.currency)} total`
          : `${money(record.price_minor, record.currency)} / month · Deposit ${money(record.deposit_minor, record.currency)}`}
      </Copy>
      <Copy muted>
        Agreed rate: {money(record.price_minor, record.currency)} /{" "}
        {record.kind === "bookings" ? "night" : "month"}
      </Copy>
      <Copy>{record.terms}</Copy>
      {!!record.note && <Copy muted>{record.note}</Copy>}
      {record.kind === "applications" && record.status === "approved" && (
        <Copy>
          Open Tenancies to review the offered agreement. Approval does not
          reserve dates.
        </Copy>
      )}
      {record.kind === "tenancies" && record.status === "offered" && (
        <Copy>
          Acceptance agrees to these dates, rent, deposit, and terms. The server
          checks availability before reserving the space.
        </Copy>
      )}
      <Row>
        {actions.map(([status, label]) => (
          <Button
            secondary
            key={status}
            label={label}
            onPress={() => setAction(status)}
          />
        ))}
      </Row>
      {!!action && (
        <Form
          key={action}
          fields={action === "ended" ? [date("ends_on", true)] : []}
          label={
            actions.find(([status]) => status === action)?.[1] ?? "Confirm"
          }
          submit={async (values) => {
            await api(`/${workspace}/${record.kind}/${record.id}`, "PATCH", {
              ...values,
              status: action,
            });
            setAction("");
            reload();
          }}
        />
      )}
    </Card>
  );
}
export function ActivityScreen({
  workspace,
  section,
}: {
  workspace: Workspace;
  section: string;
}) {
  const [kind, setKind] = useState(
    section === "tenancies" ? "tenancies" : "bookings",
  );
  const [page, setPage] = useState(1);
  const resource = useResource<{ records: Page<Activity> }>(
    `/${workspace}/${section}${query({ kind, page })}`,
  );
  const tabs =
    section === "tenancies"
      ? ["tenancies"]
      : workspace === "finder"
        ? ["bookings", "applications", "tenancies"]
        : section === "requests"
          ? ["bookings", "applications"]
          : ["bookings"];
  return (
    <>
      <Row>
        {tabs.map((tab) => (
          <Button
            key={tab}
            secondary={kind !== tab}
            label={tab}
            onPress={() => {
              setKind(tab);
              setPage(1);
            }}
          />
        ))}
      </Row>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          {!resource.data.records.data.length && <Empty />}
          {resource.data.records.data.map((record) => (
            <ActivityCard
              key={`${record.kind}-${record.id}`}
              record={record}
              workspace={workspace}
              reload={resource.reload}
            />
          ))}
          <Pagination meta={resource.data.records.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
export function MessagesScreen({
  workspace,
  conversationId,
}: {
  workspace: Workspace;
  conversationId?: string;
}) {
  const [selected, setSelected] = useState(conversationId ?? "");
  const [page, setPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [revision, setRevision] = useState(0);
  const resource = useResource<{
    conversations: Page<Thread>;
    messages: Page<Message>;
    timezone: string;
  }>(
    `/${workspace}/messages${query({ conversation_id: selected, page, messages_page: messagePage })}`,
  );
  return (
    <>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          {!resource.data.conversations.data.length && (
            <Empty text="Start a conversation from a place, or send a booking request." />
          )}
          {resource.data.conversations.data.map((thread) => (
            <Button
              secondary={selected !== String(thread.id)}
              key={thread.id}
              label={`${thread.title} · ${thread.person}`}
              onPress={() => {
                setSelected(String(thread.id));
                setMessagePage(1);
              }}
            />
          ))}
          <Pagination
            meta={resource.data.conversations.meta}
            onPage={setPage}
          />
          {!!selected && (
            <Card>
              <Copy title>Conversation</Copy>
              <Copy muted>
                Viewing proposals use {resource.data.timezone}. Pull down or
                refresh to check for replies.
              </Copy>
              <Button
                secondary
                label="Refresh messages"
                onPress={resource.reload}
              />
              {resource.data.messages.data.map((message) => (
                <Card key={message.id}>
                  <Copy muted>
                    {message.mine ? "You" : message.sender} ·{" "}
                    {new Date(message.created_at).toLocaleString()}
                  </Copy>
                  <Copy>{message.body}</Copy>
                  {message.viewing_at && (
                    <Copy>
                      Proposed viewing:{" "}
                      {new Date(message.viewing_at).toLocaleString()}
                    </Copy>
                  )}
                </Card>
              ))}
              <Pagination
                meta={resource.data.messages.meta}
                onPage={setMessagePage}
              />
              <Form
                key={revision}
                fields={messageFields}
                label="Send message"
                submit={async (values) => {
                  await api(
                    `/${workspace}/conversations/${selected}/messages`,
                    "POST",
                    values,
                  );
                  setRevision((v) => v + 1);
                  setMessagePage(1);
                  resource.reload();
                }}
              />
            </Card>
          )}
        </>
      )}
    </>
  );
}
export function NotificationsScreen({ workspace }: { workspace: Workspace }) {
  const [page, setPage] = useState(1);
  const resource = useResource<{
    notifications: Page<Notification>;
    unread: number;
  }>(`/${workspace}/notifications${query({ page })}`);
  return (
    <>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          <Copy>{resource.data.unread} unread</Copy>
          {!resource.data.notifications.data.length && <Empty />}
          {resource.data.notifications.data.map((item) => (
            <Card key={item.id}>
              <Copy title>{item.title}</Copy>
              <Copy>{item.body}</Copy>
              <Copy muted>{new Date(item.created_at).toLocaleString()}</Copy>
              {!item.read_at && (
                <Form
                  fields={[]}
                  label="Mark as read"
                  submit={async () => {
                    await api(
                      `/${workspace}/notifications/${item.id}`,
                      "PATCH",
                    );
                    resource.reload();
                  }}
                />
              )}
            </Card>
          ))}
          <Pagination
            meta={resource.data.notifications.meta}
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}
