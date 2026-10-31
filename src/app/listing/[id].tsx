import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { api, money } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useResource } from "@/hooks/use-resource";
import type { Listing } from "@/lib/types";
import { date, messageFields, number } from "@/lib/forms";
import {
  Button,
  Card,
  Copy,
  Form,
  Gallery,
  Loading,
  Photo,
  Row,
  Screen,
} from "@/components/mobile-ui";
import { ResourceState } from "@/components/rental-screens";

export default function ListingRoute() {
  const { id, preview } = useLocalSearchParams<{
    id: string;
    preview?: string;
  }>();
  const session = useSession();
  const [tab, setTab] = useState("details");
  const owner = preview === "1";
  const allowed =
    !!session.user?.email_verified_at &&
    !!session.user?.roles.includes(owner ? "owner" : "finder");
  const resource = useResource<{
    data: {
      listing: Listing;
      saved: boolean;
      unavailable: { starts_on: string; ends_on: string | null }[];
      timezone: string;
    };
  }>(
    allowed && /^\d+$/.test(id)
      ? `/${owner ? "owner" : "finder"}/listings/${id}`
      : null,
  );
  if (session.loading)
    return (
      <Screen title="Opening place">
        <Loading />
      </Screen>
    );
  if (!session.user) return <Redirect href="/" />;
  if (!allowed) return <Redirect href="/workspace/home" />;
  const detail = resource.data?.data;
  const listing = detail?.listing;
  return (
    <Screen
      title={listing?.title ?? "A place for your next chapter"}
      onRefresh={resource.reload}
      refreshing={resource.loading}
    >
      <Button
        secondary
        label="Back"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/workspace/home")
        }
      />
      <ResourceState {...resource} retry={resource.reload} />
      {listing && detail && (
        <>
          <Photo large uri={listing.cover_photo_url} />
          <Gallery photos={listing.photos} />
          <Copy muted>
            {listing.city}, {listing.country} · Hosted by {listing.host_name}
          </Copy>
          <Copy title>
            {money(listing.price_minor, listing.currency)} /{" "}
            {listing.mode === "short_stay" ? "night" : "month"}
          </Copy>
          <Copy>
            {listing.unit.capacity} people · {listing.unit.bedrooms} bedrooms ·{" "}
            {listing.unit.bathrooms} bathrooms
          </Copy>
          {owner && <Copy muted>Owner preview · {listing.status}</Copy>}
          <Row>
            {["details", ...(!owner ? ["request", "message"] : [])].map(
              (item) => (
                <Button
                  key={item}
                  label={
                    item === "request"
                      ? listing.mode === "short_stay"
                        ? "Request stay"
                        : "Apply to rent"
                      : item
                  }
                  secondary={tab !== item}
                  onPress={() => setTab(item)}
                />
              ),
            )}
          </Row>
          {tab === "details" && (
            <>
              <Card>
                <Copy>{listing.description}</Copy>
                <Copy muted>{listing.amenities.join(" · ")}</Copy>
                <Copy title>Terms</Copy>
                <Copy>{listing.terms}</Copy>
                {listing.mode === "short_stay" ? (
                  <Copy muted>
                    {listing.min_nights}–{listing.max_nights} nights per stay
                  </Copy>
                ) : (
                  <Copy muted>
                    Deposit: {money(listing.deposit_minor, listing.currency)}
                  </Copy>
                )}
              </Card>
              {!owner && (
                <>
                  <Form
                    fields={[]}
                    label={
                      detail.saved ? "Remove from saved" : "Save this place"
                    }
                    submit={async () => {
                      await api(`/finder/saved/${id}`, "PUT", {
                        saved: !detail.saved,
                      });
                      resource.reload();
                    }}
                  />
                  <Card>
                    <Copy title>Unavailable dates</Copy>
                    <Copy muted>
                      Timezone: {detail.timezone}. End dates are exclusive.
                      Availability is checked again when a request is confirmed
                      or an agreement is accepted.
                    </Copy>
                    {detail.unavailable.length ? (
                      detail.unavailable.map((range, index) => (
                        <Copy key={index}>
                          {range.starts_on} → {range.ends_on ?? "Open-ended"}
                        </Copy>
                      ))
                    ) : (
                      <Copy>No current blocks shown.</Copy>
                    )}
                  </Card>
                </>
              )}
            </>
          )}
          {tab === "request" && !owner && (
            <Card>
              <Copy title>
                {listing.mode === "short_stay"
                  ? "Request a stay"
                  : "Rental application"}
              </Copy>
              <Copy muted>
                This request does not reserve the space. The host will review
                it. Dates use {detail.timezone}.
              </Copy>
              <Form
                fields={[
                  date("starts_on", true),
                  date("ends_on", listing.mode === "short_stay"),
                  number("people", 1, listing.unit.capacity),
                  { name: "note", type: "multiline", max: 2000 },
                ]}
                initial={{ people: 1 }}
                label="Send request"
                submit={async (values) => {
                  await api(`/finder/listings/${id}/requests`, "POST", values);
                  session.setWorkspace("finder");
                  router.replace({
                    pathname: "/workspace/[section]",
                    params: { section: "stays" },
                  });
                }}
              />
            </Card>
          )}
          {tab === "message" && !owner && (
            <Card>
              <Copy muted>Viewing proposals use {detail.timezone}.</Copy>
              <Form
                fields={messageFields}
                label="Message host"
                submit={async (values) => {
                  const result = await api<{
                    data: { conversation_id: number };
                  }>(`/finder/listings/${id}/messages`, "POST", values);
                  session.setWorkspace("finder");
                  router.replace({
                    pathname: "/workspace/[section]",
                    params: {
                      section: "messages",
                      conversation_id: result.data.conversation_id,
                    },
                  });
                }}
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
