// Run only against the disposable SQLite backend documented in docs/VALIDATION.md.
import assert from "node:assert/strict";
const base = process.env.SMOKE_API_BASE;
if (
  !base ||
  !/^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/v1$/.test(base) ||
  process.env.SMOKE_DISPOSABLE !== "yes"
)
  throw new Error(
    "Set SMOKE_API_BASE to the isolated localhost API and SMOKE_DISPOSABLE=yes.",
  );
let checks = 0;
async function request(path, method = "GET", body, token, expected = 200) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  checks++;
  return result;
}
const sessions = {};
try {
  for (const role of ["owner", "finder", "admin", "superadmin"]) {
    sessions[role] = await request("/auth/login", "POST", {
      email: `${role}@example.com`,
      password: "password",
      device_name: "isolated-mobile-smoke",
    });
  }
  const owner = sessions.owner.token;
  const finder = sessions.finder.token;
  const admin = sessions.admin.token;
  const superadmin = sessions.superadmin.token;
  for (const path of [
    "/owner/overview",
    "/owner/properties",
    "/owner/listings",
    "/owner/calendar",
    "/owner/requests",
    "/owner/bookings",
    "/owner/tenancies",
    "/owner/messages",
    "/owner/notifications",
    "/notices",
  ])
    await request(path, "GET", undefined, owner);
  for (const path of [
    "/finder/listings",
    "/finder/saved",
    "/finder/stays",
    "/finder/messages",
    "/finder/notifications",
  ])
    await request(path, "GET", undefined, finder);
  for (const path of ["/admin/dashboard", "/admin/users", "/admin/notices"])
    await request(path, "GET", undefined, admin);
  await request("/owner/properties", "GET", undefined, admin, 403);
  await request("/admin/users", "GET", undefined, finder, 403);
  const propertyInput = {
    name: "Native smoke courtyard",
    property_type: "house",
    address_line: "Test lane",
    city: "Lalitpur",
    country: "Nepal",
    amenities: ["wifi"],
  };
  const property = (
    await request("/owner/properties", "POST", propertyInput, owner, 201)
  ).data;
  const unitInput = {
    property_id: property.id,
    name: "Garden room",
    unit_type: "room",
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    is_active: true,
  };
  const unit = (await request("/owner/units", "POST", unitInput, owner, 201))
    .data;
  await request(
    `/owner/units/${unit.id}`,
    "PUT",
    {
      name: "Garden room",
      capacity: 2,
      bedrooms: 1,
      bathrooms: 1,
      is_active: true,
    },
    owner,
  );
  const listingInput = {
    unit_id: unit.id,
    mode: "short_stay",
    title: "Native smoke retreat",
    description: "Disposable test offer",
    status: "published",
    price: "2500.50",
    deposit: "0",
    currency: "NPR",
    min_nights: 1,
    max_nights: 30,
    terms: "Test terms",
  };
  const listing = (
    await request("/owner/listings", "POST", listingInput, owner, 201)
  ).data;
  assert.equal(listing.price_minor, 250050);
  const date = (offset) => {
    const value = new Date();
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  await request(`/finder/saved/${listing.id}`, "PUT", { saved: true }, finder);
  assert.equal(
    (
      await request("/finder/saved", "GET", undefined, finder)
    ).listings.data.some((item) => item.id === listing.id),
    true,
  );
  const booking = (
    await request(
      `/finder/listings/${listing.id}/requests`,
      "POST",
      { starts_on: date(10), ends_on: date(12), people: 2 },
      finder,
      201,
    )
  ).data;
  assert.equal(booking.total_minor, 500100);
  await request(
    `/owner/bookings/${booking.id}`,
    "PATCH",
    { status: "confirmed" },
    owner,
  );
  await request(
    "/owner/calendar/blocks",
    "POST",
    {
      unit_id: unit.id,
      starts_on: date(11),
      ends_on: date(13),
      label: "Conflict",
    },
    owner,
    422,
  );
  await request(
    `/finder/bookings/${booking.id}`,
    "PATCH",
    { status: "cancelled" },
    finder,
  );
  const block = (
    await request(
      "/owner/calendar/blocks",
      "POST",
      {
        unit_id: unit.id,
        starts_on: date(11),
        ends_on: date(13),
        label: "Test block",
      },
      owner,
      201,
    )
  ).data;
  await request(`/owner/calendar/blocks/${block.id}`, "PATCH", {}, owner);
  const monthly = (
    await request(
      "/owner/listings",
      "POST",
      { ...listingInput, mode: "long_term", title: "Native monthly smoke" },
      owner,
      201,
    )
  ).data;
  const application = (
    await request(
      `/finder/listings/${monthly.id}/requests`,
      "POST",
      { starts_on: date(20), people: 1 },
      finder,
      201,
    )
  ).data;
  await request(
    `/owner/applications/${application.id}`,
    "PATCH",
    { status: "approved" },
    owner,
  );
  const offers = await request(
    "/finder/stays?kind=tenancies",
    "GET",
    undefined,
    finder,
  );
  const tenancy = offers.records.data.find(
    (record) => record.listing_id === monthly.id,
  );
  assert.ok(tenancy);
  await request(
    `/finder/tenancies/${tenancy.id}`,
    "PATCH",
    { status: "active" },
    finder,
  );
  await request(
    `/owner/tenancies/${tenancy.id}`,
    "PATCH",
    { status: "ended", ends_on: date(30) },
    owner,
  );
  await request(
    `/owner/properties/${property.id}`,
    "PUT",
    {
      ...propertyInput,
      amenities: [],
      hidden_photo_ids: [],
      status: "archived",
    },
    owner,
  );
  await request(
    "/users/" + sessions.superadmin.user.id + "/roles",
    "PUT",
    { roles: ["finder"] },
    superadmin,
    403,
  );
  console.log(
    `Passed ${checks} real API checks: four roles, permission denials, property/unit/offers, saved places, booking totals, conflict/cancellation, manual blocks, tenancy acceptance/end, gallery-array clearing, self-role protection.`,
  );
} finally {
  for (const session of Object.values(sessions))
    await request("/auth/logout", "POST", {}, session.token);
}
