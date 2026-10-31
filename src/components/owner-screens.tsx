import { useState } from "react";
import { router } from "expo-router";
import { api, money, query } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import {
  date,
  listingFields,
  propertyFields,
  propertyTypes,
  select,
  text,
  unitFields,
} from "@/lib/forms";
import type {
  Activity,
  CalendarEvent,
  Listing,
  Page,
  Property,
  Unit,
} from "@/lib/types";
import {
  Button,
  Card,
  Copy,
  Editor,
  Empty,
  Form,
  Gallery,
  Pagination,
  Photo,
  Row,
  type Field,
  type Values,
} from "./mobile-ui";
import { filterValues, saveForm } from "./account-screen";
import { ResourceState } from "./rental-screens";

export function OwnerOverview() {
  const resource = useResource<{
    summary: Record<string, number>;
    upcoming: Activity[];
  }>("/owner/overview");
  return (
    <>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          <Row>
            {Object.entries(resource.data.summary).map(([key, value]) => (
              <Card key={key}>
                <Copy title>{value}</Copy>
                <Copy muted>{key}</Copy>
              </Card>
            ))}
          </Row>
          <Copy title>Upcoming arrivals</Copy>
          {!resource.data.upcoming.length && (
            <Empty text="Confirmed arrivals will appear here." />
          )}
          {resource.data.upcoming.map((item) => (
            <Card key={item.id}>
              <Copy title>{item.title}</Copy>
              <Copy>
                {item.finder_name} · {item.starts_on} → {item.ends_on}
              </Copy>
            </Card>
          ))}
        </>
      )}
    </>
  );
}
function PropertyEditor({
  property,
  onSaved,
}: {
  property?: Property;
  onSaved: () => void;
}) {
  const [hidden, setHidden] = useState(
    property?.photos.filter((p) => p.is_hidden).map((p) => p.id) ?? [],
  );
  const [cover, setCover] = useState(
    property?.photos.find((p) => p.is_cover)?.id,
  );
  return (
    <>
      <Copy muted>
        {property
          ? "Save property details and gallery choices together. Upload new photos separately below."
          : "Save the property first, then open Edit property to add its gallery."}
      </Copy>
      <Form
        fields={propertyFields.filter((field) => field.name !== "photos")}
        initial={
          property
            ? { ...property }
            : {
                status: "draft",
                property_type: "house",
                country: "Nepal",
                amenities: [],
              }
        }
        submit={async (values, body) => {
          if (property) {
            if (!(body instanceof FormData)) {
              body.hidden_photo_ids = hidden;
              body.cover_photo_id =
                cover && !hidden.includes(cover) ? cover : null;
            }
          }
          await saveForm(
            `/owner/properties${property ? `/${property.id}` : ""}`,
            property ? "PUT" : "POST",
            body,
          );
          onSaved();
        }}
      />
      {property && (
        <>
          <Card>
            <Copy title>Saved gallery</Copy>
            <Copy muted>
              Hidden photos remain saved and can be restored. Choose a visible
              cover, then save the property above.
            </Copy>
            {property.photos.map((photo) => (
              <Card key={photo.id}>
                <Photo uri={photo.url} />
                <Row>
                  <Button
                    secondary
                    label={
                      hidden.includes(photo.id) ? "Restore photo" : "Hide photo"
                    }
                    onPress={() =>
                      setHidden((previous) =>
                        previous.includes(photo.id)
                          ? previous.filter((id) => id !== photo.id)
                          : [...previous, photo.id],
                      )
                    }
                  />
                  <Button
                    secondary={cover !== photo.id}
                    disabled={hidden.includes(photo.id)}
                    label={cover === photo.id ? "Cover photo" : "Use as cover"}
                    onPress={() => setCover(photo.id)}
                  />
                </Row>
              </Card>
            ))}
          </Card>
          <Card>
            <Copy title>Add gallery photos</Copy>
            <Form
              fields={[
                {
                  name: "photos",
                  type: "images",
                  required: true,
                  hint: "Up to 12 saved photos total, each JPEG/PNG/WebP at most 4 MB and 4096 × 4096.",
                },
              ]}
              label="Upload photos"
              submit={async (_, body) => {
                if (!(body instanceof FormData))
                  throw new Error("Choose photos to upload.");
                for (const key of [
                  "name",
                  "property_type",
                  "address_line",
                  "city",
                  "country",
                ] as const)
                  body.append(key, property[key]);
                await saveForm(`/owner/properties/${property.id}`, "PUT", body);
                onSaved();
              }}
            />
          </Card>
        </>
      )}
    </>
  );
}
export function PropertiesScreen() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Property | "new" | null>(null);
  const [detail, setDetail] = useState<Property | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const resource = useResource<
    Page<Property> & { summary: Record<string, number> }
  >(`/owner/properties${query({ ...filters, page })}`);
  return (
    <>
      <Row>
        <Button label="Add property" onPress={() => setEditing("new")} />
        <Button
          secondary
          label="Filter properties"
          onPress={() => setFilterOpen(!filterOpen)}
        />
      </Row>
      {filterOpen && (
        <Card>
          <Form
            fields={[
              text("search", false, 100),
              select("status", ["", "draft", "archived"], false),
              select("property_type", ["", ...propertyTypes], false),
            ]}
            initial={filters}
            label="Apply filters"
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
          <Copy muted>
            {Object.entries(resource.data.summary)
              .map(([key, value]) => `${value} ${key}`)
              .join(" · ")}
          </Copy>
          {!resource.data.data.length && (
            <Empty text="Add a property with its address and gallery. Then create a rentable space and offer." />
          )}
          {resource.data.data.map((property) => (
            <Card key={property.id}>
              <Photo uri={property.cover_photo_url} />
              <Copy title>{property.name}</Copy>
              <Copy muted>
                {property.city} ·{" "}
                {property.status === "draft" ? "In setup" : "Archived"}
              </Copy>
              <Row>
                <Button
                  secondary
                  label="Details"
                  onPress={() => setDetail(property)}
                />
                <Button
                  label="Edit property"
                  onPress={() => setEditing(property)}
                />
              </Row>
            </Card>
          ))}
          <Pagination meta={resource.data.meta} onPage={setPage} />
        </>
      )}
      {editing && (
        <Editor
          title={editing === "new" ? "Add a property" : "Edit property"}
          onClose={() => setEditing(null)}
        >
          <PropertyEditor
            property={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              resource.reload();
            }}
          />
        </Editor>
      )}
      {detail && (
        <Editor title={detail.name} onClose={() => setDetail(null)}>
          <Gallery photos={detail.photos.filter((p) => !p.is_hidden)} />
          <Copy>{detail.description}</Copy>
          <Copy>
            {[
              detail.address_line,
              detail.city,
              detail.state,
              detail.postal_code,
              detail.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </Copy>
          <Copy muted>{detail.amenities.join(" · ")}</Copy>
          <Form
            fields={[]}
            label={
              detail.status === "archived"
                ? "Restore property"
                : "Archive property"
            }
            submit={async () => {
              await api(`/owner/properties/${detail.id}`, "PUT", {
                name: detail.name,
                property_type: detail.property_type,
                address_line: detail.address_line,
                city: detail.city,
                country: detail.country,
                status: detail.status === "archived" ? "draft" : "archived",
              });
              setDetail(null);
              resource.reload();
            }}
          />
          <Copy muted>
            Archiving hides published offers but retains reservations and
            photos.
          </Copy>
        </Editor>
      )}
    </>
  );
}
type Inventory = {
  properties: { id: number; name: string; status: string }[];
  units: Page<Unit>;
  listings: Listing[];
};
type Edit = { kind: "unit"; item?: Unit } | { kind: "listing"; item?: Listing };
export function InventoryScreen() {
  const [page, setPage] = useState(1);
  const [propertyId, setPropertyId] = useState("");
  const [editing, setEditing] = useState<Edit | null>(null);
  const resource = useResource<Inventory>(
    `/owner/listings${query({ page, property_id: propertyId })}`,
  );
  const data = resource.data;
  let fields: Field[] = [];
  let initial: Values = {};
  if (editing && data) {
    if (editing.kind === "unit") {
      fields = [
        ...(editing.item
          ? []
          : [
              {
                name: "property_id",
                type: "select" as const,
                required: true,
                options: data.properties.map((p) => ({
                  value: String(p.id),
                  label: p.name,
                })),
              },
              select("unit_type", ["room", "apartment", "entire_property"]),
            ]),
        ...unitFields,
      ];
      initial = editing.item
        ? { ...editing.item }
        : {
            unit_type: "room",
            capacity: 2,
            bedrooms: 1,
            bathrooms: 1,
            is_active: true,
          };
    } else {
      fields = [
        ...(editing.item
          ? []
          : [
              {
                name: "unit_id",
                type: "select" as const,
                required: true,
                options: data.units.data.map((u) => ({
                  value: String(u.id),
                  label: `${u.property_name} · ${u.name}`,
                })),
              },
              select("mode", ["short_stay", "long_term"]),
            ]),
        ...listingFields,
      ];
      initial = editing.item
        ? {
            ...editing.item,
            price: (editing.item.price_minor / 100).toFixed(2),
            deposit: (editing.item.deposit_minor / 100).toFixed(2),
          }
        : {
            mode: "short_stay",
            status: "draft",
            currency: "NPR",
            min_nights: 1,
            max_nights: 30,
            deposit: "0",
          };
    }
  }
  return (
    <>
      <ResourceState {...resource} retry={resource.reload} />
      {data && (
        <>
          {!data.properties.length ? (
            <Empty text="Add a property first in Properties." />
          ) : (
            <>
              <Row>
                <Button
                  label="Add rentable space"
                  onPress={() => setEditing({ kind: "unit" })}
                />
                <Button
                  secondary
                  disabled={!data.units.data.length}
                  label="Create listing"
                  onPress={() => setEditing({ kind: "listing" })}
                />
              </Row>
              <Form
                fields={[
                  {
                    name: "property_id",
                    label: "Filter by property",
                    type: "select",
                    options: [
                      { value: "", label: "All properties" },
                      ...data.properties.map((p) => ({
                        value: String(p.id),
                        label: p.name,
                      })),
                    ],
                  },
                ]}
                initial={{ property_id: propertyId }}
                label="Apply"
                submit={async (values) => {
                  setPropertyId(String(values.property_id ?? ""));
                  setPage(1);
                }}
              />
              {!data.units.data.length && (
                <Empty text="Add a room, apartment, or entire-property unit to start creating rental offers." />
              )}
              {data.units.data.map((unit) => (
                <Card key={unit.id}>
                  <Copy muted>
                    {unit.property_name} · {unit.unit_type}
                  </Copy>
                  <Copy title>{unit.name}</Copy>
                  <Copy>
                    {unit.capacity} people · {unit.bedrooms} bedrooms ·{" "}
                    {unit.bathrooms} bathrooms ·{" "}
                    {unit.is_active ? "Active" : "Inactive"}
                  </Copy>
                  <Button
                    secondary
                    label="Edit space"
                    onPress={() => setEditing({ kind: "unit", item: unit })}
                  />
                  {data.listings
                    .filter((l) => l.unit_id === unit.id)
                    .map((listing) => (
                      <Card key={listing.id}>
                        <Copy title>{listing.title}</Copy>
                        <Copy muted>
                          {listing.mode} · {listing.status}
                        </Copy>
                        <Copy>
                          {money(listing.price_minor, listing.currency)}
                        </Copy>
                        <Row>
                          <Button
                            label="Edit offer"
                            onPress={() =>
                              setEditing({ kind: "listing", item: listing })
                            }
                          />
                          <Button
                            secondary
                            label="Preview"
                            onPress={() =>
                              router.push({
                                pathname: "/listing/[id]",
                                params: { id: listing.id, preview: "1" },
                              })
                            }
                          />
                        </Row>
                      </Card>
                    ))}
                </Card>
              ))}
              <Pagination meta={data.units.meta} onPage={setPage} />
            </>
          )}
          {editing && (
            <Editor
              title={
                editing.kind === "unit" ? "Rentable space" : "Rental offer"
              }
              onClose={() => setEditing(null)}
            >
              <Copy muted>
                {editing.kind === "unit"
                  ? "A property can have one entire-property unit or multiple rooms/apartments. The first unit fixes this choice."
                  : "One offer per unit and rental mode. Publishing requires an active space and unarchived property."}
              </Copy>
              <Form
                key={`${editing.kind}-${editing.item?.id ?? "new"}`}
                fields={fields}
                initial={initial}
                submit={async (values) => {
                  const kind = editing.kind === "unit" ? "units" : "listings";
                  await api(
                    `/owner/${kind}${editing.item ? `/${editing.item.id}` : ""}`,
                    editing.item ? "PUT" : "POST",
                    values,
                  );
                  setEditing(null);
                  resource.reload();
                }}
              />
            </Editor>
          )}
        </>
      )}
    </>
  );
}
export function CalendarScreen() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [page, setPage] = useState(1);
  const resource = useResource<{
    month: string;
    units: Page<Unit>;
    events: CalendarEvent[];
  }>(`/owner/calendar${query({ month, page })}`);
  const shift = (offset: number) => {
    const [year, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(year, m - 1 + offset, 1));
    setMonth(d.toISOString().slice(0, 7));
    setPage(1);
  };
  return (
    <>
      <Row>
        <Button secondary label="Previous month" onPress={() => shift(-1)} />
        <Copy>{month}</Copy>
        <Button secondary label="Next month" onPress={() => shift(1)} />
      </Row>
      <Copy muted>
        Dates use UTC. Departure/end dates are exclusive and available for
        another arrival. An empty end blocks indefinitely.
      </Copy>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          {!resource.data.units.data.length && (
            <Empty text="Add a rentable space to manage availability." />
          )}
          {resource.data.units.data.map((unit) => (
            <Card key={unit.id}>
              <Copy title>{unit.name}</Copy>
              <Copy muted>{unit.property_name}</Copy>
              <Row>
                {Array.from(
                  {
                    length: new Date(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5)),
                      0,
                    ).getDate(),
                  },
                  (_, i) => {
                    const day = `${month}-${String(i + 1).padStart(2, "0")}`;
                    const event = resource.data!.events.find(
                      (e) =>
                        e.unit_id === unit.id &&
                        e.starts_on <= day &&
                        (!e.ends_on || e.ends_on > day),
                    );
                    return (
                      <Copy key={day}>
                        {i + 1}
                        {event ? " ▰" : " ·"}
                      </Copy>
                    );
                  },
                )}
              </Row>
              {resource
                .data!.events.filter((e) => e.unit_id === unit.id)
                .map((event) => (
                  <Card key={event.id}>
                    <Copy>
                      {event.label ??
                        (event.booking_id
                          ? "Booking"
                          : event.tenancy_id
                            ? "Tenancy"
                            : "Blocked")}
                    </Copy>
                    <Copy muted>
                      {event.starts_on} → {event.ends_on ?? "Open-ended"}
                    </Copy>
                    {!event.booking_id && !event.tenancy_id && (
                      <Form
                        fields={[]}
                        label="Release manual block"
                        submit={async () => {
                          await api(
                            `/owner/calendar/blocks/${event.id}`,
                            "PATCH",
                          );
                          resource.reload();
                        }}
                      />
                    )}
                  </Card>
                ))}
            </Card>
          ))}
          <Pagination meta={resource.data.units.meta} onPage={setPage} />
          {!!resource.data.units.data.length && (
            <Card>
              <Copy title>Keep dates for yourself</Copy>
              <Form
                fields={[
                  {
                    name: "unit_id",
                    type: "select",
                    required: true,
                    options: resource.data.units.data.map((u) => ({
                      value: String(u.id),
                      label: `${u.property_name} · ${u.name}`,
                    })),
                  },
                  text("label", true, 150),
                  date("starts_on", true),
                  date("ends_on"),
                ]}
                label="Block dates"
                submit={async (values) => {
                  await api("/owner/calendar/blocks", "POST", values);
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
