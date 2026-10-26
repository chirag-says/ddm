import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api';
import { setPendingIntent, useAuth } from '@/auth';
import {
  adaptProjectDetail,
  FactGrid,
  formatDadoHeight,
  splitHighlights,
  unitFacts,
  unitPhotos,
  useCreateBooking,
  useProjectDetail,
  useUnitTypeDetail,
  type ProjectPhoto,
  type UnitFactKey,
} from '@/features/projects';
import { PhotoViewerModal } from '@/features/properties';
import { screenPadding, spacing, useTheme } from '@/theme';
import type { UnitType } from '@/types/backend/project';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Image,
  Input,
  PriceLabel,
  Screen,
  ScreenHeader,
  Sheet,
  Skeleton,
  Tag,
  Text,
  useToast,
} from '@/ui';

const FACT_ICON: Record<UnitFactKey, keyof typeof Ionicons.glyphMap> = {
  carpet: 'resize-outline',
  builtUp: 'square-outline',
  superBuiltUp: 'scan-outline',
  rate: 'pricetag-outline',
  facing: 'compass-outline',
  furnishing: 'bed-outline',
  parking: 'car-outline',
};

const HERO_HEIGHT = 240;

/**
 * One builder unit type, and the one thing a buyer can do about it: enquire.
 *
 * DealDirect takes no money from users (owner decision, 2026-10-19). This
 * screen used to offer a paid token booking beside the enquiry, with its own
 * sheet, its own refusal for units with no token configured, and a payment
 * screen after it. All of that is gone, and `POST /bookings` now records an
 * enquiry whatever the client sends. Group buy went at the same time.
 *
 * Laid out like the project page since 2026-10-26: photos first (the unit's
 * floor plan and rooms, else the project's, all opening full screen), then
 * price, availability and the size facts in one grid, then one price card and
 * grouped specifications. It used to open on a price card with no picture,
 * repeat the list price across two cards, and squeeze spec labels to one
 * letter a line ("Ma / in / do / or").
 */
export default function UnitTypeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { unitTypeId, resume } = useLocalSearchParams<{ unitTypeId: string; resume?: string }>();
  const { unitType, isLoading, error, refresh } = useUnitTypeDetail(unitTypeId);
  const { status } = useAuth();
  const insets = useSafeAreaInsets();
  /**
   * `resume=enquiry` means a guest pressed "Enquire" before signing in, so the
   * sheet they asked for opens on arrival. Compared against the one real value
   * rather than treated as truthy, so a stale or hand-written link only opens
   * the screen. Opening the sheet sends nothing: the buyer still has to press
   * "Send enquiry".
   */
  const [sheetOpen, setSheetOpen] = useState(resume === 'enquiry');

  const projectRef = typeof unitType?.project === 'object' ? unitType.project : undefined;
  const projectId = projectRef?._id ?? (typeof unitType?.project === 'string' ? unitType.project : undefined);

  // Usually already cached by the project page this was opened from, so the
  // fallback photos cost no request.
  const { project } = useProjectDetail(projectId ?? '');

  const ownPhotos = useMemo(() => (unitType ? unitPhotos(unitType) : []), [unitType]);
  const projectPhotos = useMemo(() => (project ? adaptProjectDetail(project).gallery : []), [project]);
  const usingProjectPhotos = ownPhotos.length === 0 && projectPhotos.length > 0;
  const photos: ProjectPhoto[] = usingProjectPhotos ? projectPhotos : ownPhotos;

  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerAt, setViewerAt] = useState<number | null>(null);

  /**
   * Measured, not assumed. The scroll view used a hardcoded `paddingBottom:
   * 100` to clear the action bar, which is wrong on the first device with a
   * different bottom inset and wrong again when the label wraps at a large
   * text size. Same approach `property/[id]` takes with `DetailActions`.
   */
  const [actionBarHeight, setActionBarHeight] = useState(96);
  const onActionBarLayout = useCallback(
    (event: LayoutChangeEvent) => setActionBarHeight(event.nativeEvent.layout.height),
    []
  );

  const isAuthenticated = status === 'authenticated';

  // `POST /bookings` is authMiddleware-gated, so a guest who filled this form
  // in would only discover that at submit — and a 401 there reads as a dead
  // session rather than "please sign in". Gate before the form opens, which
  // is what the website does too.
  const openSheet = () => {
    if (!isAuthenticated) {
      // The unit is recorded so that signing in lands back here with the
      // enquiry sheet open, not on the Search tab. See `auth/pendingIntent.ts`.
      setPendingIntent({ kind: 'unit', unitTypeId });
      router.push('/(auth)/login');
      return;
    }
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <Screen>
        <Skeleton height={HERO_HEIGHT} radius={0} />
        <View className="p-base">
          <Skeleton height={28} className="mb-base" />
          <Skeleton height={120} radius={12} />
        </View>
      </Screen>
    );
  }

  if (error || !unitType) {
    return (
      <Screen>
        <ErrorState title="Could not load this unit type" onRetry={refresh} />
      </Screen>
    );
  }

  const price = unitType.pricing?.effectivePrice ?? unitType.pricing?.basePrice;
  const videoUrl = unitType.floorPlans?.videoUrl;
  const config = unitType.config;
  const highlights = splitHighlights(unitType.highlights);
  const projectLine = [
    projectRef?.basics?.name,
    [projectRef?.location?.locality, projectRef?.location?.city].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join(' · ');
  const configLine = [
    config?.bedrooms ? `${config.bedrooms} Bed` : undefined,
    config?.bathrooms ? `${config.bathrooms} Bath` : undefined,
    typeof config?.balconies === 'number' && config.balconies > 0
      ? `${config.balconies} ${config.balconies === 1 ? 'Balcony' : 'Balconies'}`
      : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  /**
   * Availability, read from the field that exists. `inventory.available` was
   * read here for months and is not on the model — see the note on the type.
   *
   * The server refuses an enquiry with NO_INVENTORY unless `availableUnits` is
   * at least 1, so an unset count refuses as firmly as an exhausted one. The
   * two causes get different copy because they mean different things to a
   * buyer: one is "come back later", the other is "we have not published this
   * yet".
   */
  const available = unitType.inventory?.availableUnits;
  const total = unitType.inventory?.totalUnits;
  const hasUnits = typeof available === 'number' && available >= 1;
  const soldOut = typeof available === 'number' && available <= 0;

  return (
    // Top only: the action bar pads itself by `insets.bottom`, and the default
    // bottom edge here doubled it into an empty band under the button.
    <Screen edges={['top']}>
      {/*
        Back to the PROJECT, not the projects list. This screen is only ever
        reached from a project's unit-type rows, so `/projects` skipped a level
        and dropped the user two screens back from where they were. Falls back
        to the list only when the unit type carries no project reference.
      */}
      <ScreenHeader title={config?.name ?? 'Unit type'} backTo={projectId ? `/projects/${projectId}` : '/projects'} />

      <ScrollView contentContainerStyle={{ paddingBottom: actionBarHeight + spacing.xl }}>
        {photos.length > 0 ? (
          <View style={{ height: HERO_HEIGHT }}>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(photo, index) => `${photo.uri}-${index}`}
              initialNumToRender={1}
              windowSize={3}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onMomentumScrollEnd={(event) => setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index }) => (
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`Open ${item.label ?? 'photo'} ${index + 1} of ${photos.length} full screen`}
                  onPress={() => setViewerAt(index)}
                >
                  <Image uri={item.uri} size="medium" style={{ width, height: HERO_HEIGHT }} />
                </Pressable>
              )}
            />
            {/* Said on the photo, so a project render is not taken for this flat. */}
            {usingProjectPhotos ? (
              <PhotoTag icon="business-outline" label="Project photos" style={{ left: spacing.md }} />
            ) : photos[photoIndex]?.label ? (
              <PhotoTag icon="image-outline" label={photos[photoIndex].label!} style={{ left: spacing.md }} />
            ) : null}
            {photos.length > 1 ? (
              <PhotoTag icon="images-outline" label={`${photoIndex + 1}/${photos.length}`} style={{ right: spacing.md }} />
            ) : null}
          </View>
        ) : null}

        <View style={{ padding: screenPadding }}>
          {/* The unit's name is the nav bar title, so it is not repeated here. */}
          {projectLine ? (
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {projectLine}
            </Text>
          ) : null}
          {configLine ? (
            <Text variant="callout" className="mt-xs">
              {configLine}
            </Text>
          ) : null}

          <View className="mt-base flex-row items-center justify-between">
            {price ? <PriceLabel price={price} variant="title1" /> : <View />}
            {hasUnits ? (
              <Badge
                tone="success"
                label={typeof total === 'number' && total >= available ? `${available} of ${total} left` : `${available} left`}
              />
            ) : soldOut ? (
              <Badge tone="danger" label="Sold out" />
            ) : null}
          </View>

          <FactGrid
            className="mt-lg"
            facts={unitFacts(unitType).map((fact) => ({ ...fact, icon: FACT_ICON[fact.key] }))}
          />

          {highlights.length > 0 ? (
            <Section title="Highlights">
              {/* Separate items read as tags; one unsplittable string reads as a sentence. */}
              {highlights.length > 1 ? (
                <View className="flex-row flex-wrap gap-sm">
                  {highlights.map((item) => (
                    <Tag key={item} label={item} icon="checkmark-circle" />
                  ))}
                </View>
              ) : (
                <Text variant="body" tone="secondary">
                  {highlights[0]}
                </Text>
              )}
            </Section>
          ) : null}

          <PriceCard unitType={unitType} />
          <SpecsCard specs={unitType.specifications} />
          <TowerCard inventory={unitType.inventory} />

          {videoUrl ? (
            /*
              Linked, never embedded. The field is free-text and admins paste
              YouTube links, Drive links and raw MP4s into it interchangeably —
              a player that assumes any one of those is broken for the other two,
              and the website made the same call for the same reason.
            */
            <Card className="mt-xl flex-row items-center justify-between" onPress={() => void Linking.openURL(videoUrl)}>
              <View className="flex-1 pr-base">
                <Text variant="bodyEmphasis">Video tour</Text>
                <Text variant="footnote" tone="secondary" className="mt-xs">
                  Opens outside the app
                </Text>
              </View>
              <Ionicons name="play-circle" size={28} color={theme.colors.accent} />
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {/*
        The action bar. `insets.bottom` was missing entirely, so on any device
        with a home indicator the button sat underneath it.
      */}
      <View
        onLayout={onActionBarLayout}
        className="border-t border-border bg-surface"
        style={{
          paddingHorizontal: screenPadding,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
        }}
      >
        {/* A disabled control needs to say why. A greyed button with no caption
            is the most common way an interface makes a user feel stupid - see
            `DetailActions`, which states its own refusal. */}
        {!hasUnits ? (
          <Text variant="caption" tone="muted" className="mb-sm">
            {soldOut
              ? 'Every unit of this type is taken. Other unit types in this project may still be available.'
              : 'Availability for this unit type has not been published yet. Please check back, or contact us.'}
          </Text>
        ) : null}

        <Button label="Enquire about this unit" disabled={!hasUnits} fullWidth onPress={openSheet} />
      </View>

      {projectId ? (
        <EnquirySheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          projectId={projectId}
          unitTypeId={unitType._id}
        />
      ) : null}

      <PhotoViewerModal images={photos} openAt={viewerAt} onClose={() => setViewerAt(null)} />
    </Screen>
  );
}

function PhotoTag({
  icon,
  label,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  style: { left?: number; right?: number };
}) {
  return (
    <View
      pointerEvents="none"
      className="flex-row items-center rounded-full px-sm py-xs"
      style={{ position: 'absolute', bottom: spacing.md, backgroundColor: 'rgba(0,0,0,0.6)', ...style }}
    >
      <Ionicons name={icon} size={13} color="#FFFFFF" />
      <Text variant="caption" style={{ color: '#FFFFFF', marginLeft: 4 }}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-xl">
      <Text variant="title3" className="mb-sm">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** ₹ with Indian digit grouping. */
function rupees(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

/**
 * One label/value line.
 *
 * The label keeps a fixed share of the row and the value takes the rest,
 * wrapping and right-aligned. The label used to be the flexible side, so a
 * long value ("Decorative Laminated Flush Door") squeezed "Main door" to one
 * letter a line.
 */
function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  const variant = emphasis ? 'bodyEmphasis' : 'body';
  return (
    <View className="flex-row items-start py-xs">
      <Text variant={variant} tone={emphasis ? 'primary' : 'secondary'} style={{ width: '42%' }} className="pr-sm">
        {label}
      </Text>
      <Text variant={variant} className="flex-1 text-right">
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="my-xs border-t border-border" />;
}

/**
 * What the buyer pays, in one card.
 *
 * Base price plus the builder's charges makes the list price, the headline
 * figure (`effectivePrice` is that sum, computed server-side). Government
 * charges come after it and are labelled indicative: GST, stamp duty and
 * registration are deliberately kept OUT of `effectivePrice` server-side, so
 * they are added here, with the percentages shown so the arithmetic can be
 * checked. These were two cards that each restated the list price.
 */
function PriceCard({ unitType }: { unitType: UnitType }) {
  const pricing = unitType.pricing;
  const charges = pricing?.additionalCharges;
  const base = pricing?.basePrice ?? 0;
  const list = pricing?.effectivePrice ?? base;

  const builderLines = (
    [
      ['PLC', charges?.plc ?? 0],
      ['Parking', charges?.parking ?? 0],
      ['Clubhouse', charges?.clubhouse ?? 0],
      ['Legal', charges?.legal ?? 0],
      ['Maintenance', charges?.maintenance ?? 0],
      ['View premium', pricing?.viewPremium ?? 0],
    ] as [string, number][]
  ).filter(([, value]) => value > 0);

  const terms = unitType.paymentTerms;
  const gst = terms?.gstPercentage ? Math.round((list * terms.gstPercentage) / 100) : 0;
  const stamp = terms?.stampDutyPercentage ? Math.round((list * terms.stampDutyPercentage) / 100) : 0;
  const registration = terms?.registrationCharges ?? 0;
  const hasGovernment = gst > 0 || stamp > 0 || registration > 0;

  // Nothing to explain: the headline price above already says it all.
  if (!list || (builderLines.length === 0 && !hasGovernment)) return null;

  return (
    <Section title="Price breakdown">
      <Card>
        {builderLines.length > 0 && base ? (
          <>
            <Row label="Base price" value={rupees(base)} />
            {builderLines.map(([label, value]) => (
              <Row key={label} label={label} value={rupees(value)} />
            ))}
            <Divider />
          </>
        ) : null}
        <Row label="List price" value={rupees(list)} emphasis />

        {hasGovernment ? (
          <>
            {gst > 0 ? <Row label={`GST (${terms?.gstPercentage}%)`} value={rupees(gst)} /> : null}
            {stamp > 0 ? <Row label={`Stamp duty (${terms?.stampDutyPercentage}%)`} value={rupees(stamp)} /> : null}
            {registration > 0 ? <Row label="Registration" value={rupees(registration)} /> : null}
            <Divider />
            <Row label="All-inclusive" value={rupees(list + gst + stamp + registration)} emphasis />
            <Text variant="caption" tone="muted" className="mt-sm">
              Government charges are indicative. They vary by state and are confirmed at registration.
            </Text>
          </>
        ) : null}
      </Card>
    </Section>
  );
}

/**
 * Specifications, grouped the way spec sheets group them.
 *
 * Booleans read as absent when false, which is correct: "no modular kitchen"
 * is not a specification anyone advertises, and rendering it as a row would
 * turn an unfilled field into a stated negative.
 */
function SpecsCard({ specs }: { specs: UnitType['specifications'] }) {
  if (!specs) return null;

  const clean = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
  const extras = (...flags: (string | false | undefined)[]) => flags.filter(Boolean).join(', ') || undefined;
  const acPoints = specs.electrical?.acPointsPerRoom;

  const allGroups: { title: string; rows: [string, string | undefined][] }[] = [
    { title: 'Structure', rows: [['Frame', clean(specs.structure)]] },
    {
      title: 'Flooring',
      rows: [
        ['Living / dining', clean(specs.flooring?.livingDining)],
        ['Bedrooms', clean(specs.flooring?.bedrooms)],
        ['Kitchen', clean(specs.flooring?.kitchen)],
        ['Bathroom', clean(specs.flooring?.bathroom)],
        ['Balcony', clean(specs.flooring?.balcony)],
      ],
    },
    {
      title: 'Kitchen',
      rows: [
        ['Countertop', clean(specs.kitchen?.countertop)],
        ['Sink', clean(specs.kitchen?.sink)],
        ['Includes', extras(specs.kitchen?.isModular && 'Modular kitchen', specs.kitchen?.chimney && 'Chimney')],
      ],
    },
    {
      title: 'Bathroom',
      rows: [
        ['Sanitaryware', clean(specs.bathroom?.sanitaryBrand)],
        ['Fittings', clean(specs.bathroom?.fittingsBrand)],
        ['Dado height', formatDadoHeight(specs.bathroom?.dadoHeight)],
      ],
    },
    {
      title: 'Doors and windows',
      rows: [
        ['Main door', clean(specs.doors?.mainDoor)],
        ['Internal doors', clean(specs.doors?.internalDoors)],
        ['Windows', extras(clean(specs.windows?.type), specs.windows?.mosquitoMesh && 'mosquito mesh')],
      ],
    },
    {
      title: 'Electrical',
      rows: [
        ['Wiring', clean(specs.electrical?.wiringType)],
        ['Switches', clean(specs.electrical?.switchBrand)],
        ['AC points', acPoints ? `${acPoints} per room` : undefined],
      ],
    },
  ];
  const groups = allGroups
    .map((group) => ({ ...group, rows: group.rows.filter((row) => Boolean(row[1])) }))
    .filter((group) => group.rows.length > 0);

  if (groups.length === 0) return null;

  return (
    <Section title="Specifications">
      <Card>
        {groups.map((group, index) => (
          <View key={group.title} className={index > 0 ? 'mt-base border-t border-border pt-sm' : undefined}>
            <Text variant="footnote" tone="muted" className="mb-xs">
              {group.title}
            </Text>
            {group.rows.map(([label, value]) => (
              <Row key={label} label={label} value={value!} />
            ))}
          </View>
        ))}
      </Card>
    </Section>
  );
}

/**
 * Units per tower, only where towers are named. The overall count is the
 * badge beside the price; live data carries `towerAllocation` entries with no
 * tower at all, which used to leave a "By tower" heading over nothing.
 */
function TowerCard({ inventory }: { inventory: UnitType['inventory'] }) {
  const towers = (Array.isArray(inventory?.towerAllocation) ? inventory.towerAllocation : [])
    .map((entry) => entry as { tower?: string; units?: number })
    .filter((entry) => typeof entry?.tower === 'string' && entry.tower.trim());

  if (towers.length === 0) return null;

  return (
    <Section title="Units by tower">
      <Card>
        {towers.map((entry, index) => (
          <Row key={`${entry.tower}-${index}`} label={entry.tower!} value={`${entry.units ?? 0} units`} />
        ))}
      </Card>
    </Section>
  );
}

/**
 * The enquiry form.
 *
 * It posts to `POST /bookings`, which kept its name when it stopped taking
 * money. There is no booking variant of this sheet any more; `intent` is sent
 * only so a server from before the change records an enquiry too (see
 * `CreateBookingRequest`). Success leads nowhere but a toast. The buyer is waiting on a phone call, and the
 * enquiry is listed under My enquiries if they want to see or withdraw it.
 */
function EnquirySheet({
  visible,
  onClose,
  projectId,
  unitTypeId,
}: {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  unitTypeId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { createBooking, isPending, error, reset } = useCreateBooking();

  const [clientName, setClientName] = useState(user?.name ?? '');
  const [clientPhone, setClientPhone] = useState(user?.phone ?? '');
  const [clientEmail, setClientEmail] = useState(user?.email ?? '');
  const [notes, setNotes] = useState('');

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      const response = await createBooking({
        projectId,
        unitTypeId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        intent: 'enquiry',
      });

      close();
      // The server's own sentence is the right one: it is the promise being
      // made. The fallback only covers a response that arrives without one.
      toast.show(response.message || 'Thanks. Our team will call you shortly.');
    } catch {
      // surfaced via `error` below
    }
  };

  /**
   * Every refusal this route makes is one the buyer can do something about, so
   * each gets its own sentence and, where there is one, its own way out. The
   * generic message would be true and useless: "please check the details" for a
   * unit that is simply sold out.
   */
  const refusal = (() => {
    if (!(error instanceof ApiError)) return null;

    switch (error.code) {
      case 'DUPLICATE_ENQUIRY':
        return {
          message:
            'You already have an open enquiry for this unit. Withdraw it from My enquiries if you want to start again.',
          actionLabel: 'View my enquiries',
          onAction: () => {
            close();
            router.push('/projects/bookings');
          },
        };
      case 'NO_INVENTORY':
        return {
          message:
            'The last unit of this type went while this was open. Nothing was submitted.',
        };
      default:
        return { message: error.message };
    }
  })();

  return (
    <Sheet visible={visible} onClose={close} title="Enquire about this unit" heightRatio={0.75}>
      {/*
        A bare, shrinkable ScrollView — no KeyboardAvoidingView.

        This used to be `<KeyboardAvoider>` wrapping the scroll view, and that
        is why the sheet opened empty: `KeyboardAvoider` is `flex-1`, the
        sheet's body is auto-height, and a `flex-1` child of an auto-height
        parent lays out at zero. The whole form — four fields and the confirm
        button — was present, measured, and one point tall. See the note on the
        body in `ui/Sheet`.

        It was also the wrong tool. A sheet is positioned by the modal root, so
        avoidance has to move the SHEET; `Sheet` now reads the keyboard height
        itself and lifts the surface, which fixes this form and every other
        sheet that asks for text.
      */}
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="footnote" tone="secondary" className="mb-base">
          Our team will call you back about this unit: availability, pricing and next steps.
        </Text>

        <Input label="Full name" value={clientName} onChangeText={setClientName} />
        <Input
          label="Phone"
          value={clientPhone}
          onChangeText={setClientPhone}
          keyboardType="phone-pad"
          containerClassName="mt-base"
        />
        <Input
          label="Email (optional)"
          value={clientEmail}
          onChangeText={setClientEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          containerClassName="mt-base"
        />
        <Input
          label="What would you like to know? (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          containerClassName="mt-base"
        />

        {refusal ? (
          <View className="mt-base">
            <Text variant="footnote" tone="danger">
              {refusal.message}
            </Text>
            {refusal.actionLabel ? (
              <Button
                label={refusal.actionLabel}
                variant="secondary"
                className="mt-sm"
                onPress={refusal.onAction}
              />
            ) : null}
          </View>
        ) : null}

        <Button
          label="Send enquiry"
          className="mt-lg"
          loading={isPending}
          disabled={!clientName.trim() || !clientPhone.trim()}
          onPress={() => void handleSubmit()}
        />
      </ScrollView>
    </Sheet>
  );
}
