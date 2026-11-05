import { Fragment, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useApp, useAuditView, useLoad, USING_MOCK_DATA, useViewer } from '@/data/AppStore';
import type { AdminDashboard as Dashboard, AdminFamilyRow, FamilyStatus } from '@/domain/admin';
import { partOfDay } from '@/domain/dates';
import { Loading, LoadError } from '@/ui/Loading';
import { body, C, display, eyebrow } from '@/ui/theme';

type Section = 'Families' | 'Follow-ups' | 'Referrals' | 'Invite families' | 'Reports';
const SECTIONS: Section[] = ['Families', 'Follow-ups', 'Referrals', 'Invite families', 'Reports'];

const PILL: Record<FamilyStatus, [string, string]> = {
  'Needs follow-up': [C.foxSoft, C.rustDeep],
  Improving: [C.goldSoft, C.goldInk2],
  'On track': [C.greenSoft, C.greenDeep],
  Private: [C.lineSoft, C.muted],
};

/** Canvas A1 · Admin: partner dashboard. Only opted-in families, only what they share. */
export default function AdminDashboard() {
  const me = useViewer('admin');
  const { now, act, signOut } = useApp();
  // Screens never read raw data; they render the policy-scoped projection.
  const loaded = useLoad<Dashboard>((b, s, t) => b.adminDashboard(s, t));
  useAuditView('admin.dashboard.view', me.orgId);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [section, setSection] = useState<Section>('Families');
  const [filter, setFilter] = useState<'flag' | 'all'>('flag');
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const d = loaded.data;
  if (!d) {
    return (
      <View style={[styles.page, { justifyContent: 'center' }]}>
        {loaded.error ? <LoadError error={loaded.error} retry={loaded.reload} /> : <Loading />}
      </View>
    );
  }

  const showFlagged = section === 'Follow-ups' || (section === 'Families' && filter === 'flag');
  const rows = showFlagged ? d.rows.filter((r) => r.flag) : d.rows;
  const maxPct = Math.max(1, ...d.selfStarterWeeks.map((w) => w.pct));

  const onAction = (r: AdminFamilyRow) => {
    if (r.action === 'Suggest coach') void act('referral.suggest_coach', (b, s) => b.adminSuggestCoach(s, r.studentId), { studentId: r.studentId });
    else if (r.action === 'Reach out') setContacted((s) => new Set(s).add(r.studentId));
    else setOpen((o) => (o === r.studentId ? null : r.studentId));
  };
  const actionLabel = (r: AdminFamilyRow) =>
    r.action === 'Suggest coach' && r.coachSuggested
      ? 'Coach suggested ✓'
      : r.action === 'Reach out' && contacted.has(r.studentId)
        ? 'Contacted ✓'
        : r.action === 'View' && open === r.studentId
          ? 'Hide'
          : r.action;

  return (
    <View style={[styles.page, { flexDirection: wide ? 'row' : 'column' }]}>
      <View accessibilityRole="navigation" aria-label="Admin" style={[styles.side, wide ? { width: 240 } : { width: '100%' }]}>
        <Text style={[display(800), { fontSize: 24, color: C.cream, marginBottom: 4 }]}>
          EarlySignal<Text style={{ color: C.gold }}>.</Text>
        </Text>
        <Text style={[eyebrow(C.creamMuted, 12), { marginBottom: 18 }]}>Partner admin</Text>
        <View style={wide ? { gap: 6 } : { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {SECTIONS.map((s) => {
            const on = s === section;
            return (
              <Pressable key={s} accessibilityRole="link" accessibilityState={{ selected: on }} onPress={() => setSection(s)} style={[styles.sideItem, on && { backgroundColor: C.gold }]}>
                <Text style={[body(on ? 800 : 700), { fontSize: 15, color: on ? C.ink : C.cream }]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
        {wide && <View style={{ flexGrow: 1, minHeight: 24 }} />}
        <Text style={[body(400), { fontSize: 13, lineHeight: 19, color: C.creamMuted, marginTop: wide ? 0 : 16 }]}>
          You only see what each family chose to share. Never notes, messages or grades.
        </Text>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={{ marginTop: 12, minHeight: 36, justifyContent: 'center' }}>
          <Text style={[body(700), { fontSize: 13, color: C.creamMuted, textDecorationLine: 'underline' }]}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.main, { paddingHorizontal: wide ? 40 : 16 }]}>
        <View style={styles.head}>
          <View style={{ gap: 4, flexShrink: 1 }}>
            <Text style={eyebrow(C.rust)}>{d.orgName} · Counselor view</Text>
            <Text accessibilityRole="header" style={[display(800), { fontSize: 34, color: C.ink }]}>
              Good {partOfDay(now)}, {d.adminName}
            </Text>
          </View>
          <Text style={[body(800), styles.badge]}>{USING_MOCK_DATA ? 'Example data · ' : ''}week of {d.weekOf}</Text>
        </View>

        <View style={styles.kpis}>
          <Kpi label="Families enrolled" value={String(d.enrolled)} sub={`+${d.newThisMonth} this month`} subColor={C.greenParent} subBold />
          <Kpi label="Weekly self-starters" value={`${d.selfStarterPct}%`} sub="3+ check-ins, unprompted" />
          <Kpi label="Need follow-up" value={String(d.needFollowUp)} sub="Patterns over 2+ weeks" alert />
          <Kpi label="Open referrals" value={String(d.openReferrals)} sub={`${d.waitingOnClinic} waiting on a clinic`} />
        </View>

        {(section === 'Invite families' || section === 'Reports') ? (
          <View style={[styles.panel, { gap: 8 }]}>
            <Text style={[display(700), { fontSize: 22, color: C.ink }]}>{section}</Text>
            <Text style={[body(400), { fontSize: 14, color: C.muted }]}>Not on the design canvas yet. Coming in a later pass.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'flex-start' }}>
            <View style={[styles.panel, { flex: wide ? 1 : undefined, width: wide ? undefined : '100%', gap: 14 }]}>
              {section === 'Referrals' ? (
                <>
                  <Text accessibilityRole="header" style={[display(700), { fontSize: 22, color: C.ink }]}>Referrals</Text>
                  {d.referralQueue.map((r) => (
                    <View key={r.id} style={styles.refRowLight}>
                      <Text style={[body(700), { fontSize: 14, color: C.ink }]}>{r.label}</Text>
                      <Text style={[body(800), { fontSize: 14, color: r.highlight ? C.greenParent : C.muted }]}>{r.status}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <View style={styles.tableHead}>
                    <Text accessibilityRole="header" style={[display(700), { fontSize: 22, color: C.ink }]}>
                      {section === 'Follow-ups' ? 'Follow-ups' : 'Families'}
                    </Text>
                    {section === 'Families' && (
                      <View accessibilityRole="radiogroup" aria-label="Filter families" style={{ flexDirection: 'row', gap: 6 }}>
                        {([['flag', `Needs follow-up (${d.needFollowUp})`], ['all', 'All families']] as const).map(([id, label]) => {
                          const on = id === filter;
                          return (
                            <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setFilter(id)} style={[styles.chip, { backgroundColor: on ? C.ink : C.card, borderColor: on ? C.ink : C.line }]}>
                              <Text style={[body(800), { fontSize: 14, color: on ? C.cream : C.ink }]}>{label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <TableScroll wide={wide}>
                    <View style={wide ? { width: '100%' } : { minWidth: 560 }} accessibilityRole="grid">
                      <View style={[styles.tr, { borderBottomColor: C.line }]}>
                        {['Student', 'Grade', 'Pattern', 'Status', ''].map((h, i) => (
                          <Text key={i} style={[body(800), styles.th, COLS[i]]}>{h}</Text>
                        ))}
                      </View>
                      {rows.map((r) => {
                        const [pb, pf] = PILL[r.status];
                        return (
                          <Fragment key={r.studentId}>
                            <View style={styles.tr}>
                              <Text style={[body(800), styles.td, COLS[0]]}>{r.name}</Text>
                              <Text style={[body(400), styles.td, COLS[1]]}>{r.grade}</Text>
                              <Text style={[body(400), styles.td, COLS[2], { color: C.muted2 }]}>{r.pattern}</Text>
                              <View style={[COLS[3], { paddingVertical: 12, paddingHorizontal: 8 }]}>
                                <Text numberOfLines={1} style={[body(800), styles.pill, { backgroundColor: pb, color: pf }]}>{r.status}</Text>
                              </View>
                              <View style={[COLS[4], { alignItems: 'flex-end', paddingVertical: 8, paddingHorizontal: 8 }]}>
                                <Pressable accessibilityRole="button" onPress={() => onAction(r)} style={styles.action}>
                                  <Text numberOfLines={1} style={[body(800), { fontSize: 13, color: C.rust }]}>{actionLabel(r)}</Text>
                                </Pressable>
                              </View>
                            </View>
                            {open === r.studentId && (
                              <Text style={[body(400), { fontSize: 13, color: C.muted, paddingHorizontal: 8, paddingBottom: 10 }]}>
                                Shares: {r.shares.join(', ') || 'nothing'}.
                              </Text>
                            )}
                          </Fragment>
                        );
                      })}
                      {rows.length === 0 && <Text style={[body(400), { fontSize: 14, color: C.muted, padding: 12 }]}>No families need follow-up this week.</Text>}
                    </View>
                  </TableScroll>
                </>
              )}
            </View>

            <View style={{ width: wide ? 300 : '100%', gap: 16 }}>
              <View style={[styles.panel, { gap: 12 }]}>
                <Text accessibilityRole="header" style={[display(700), { fontSize: 20, color: C.ink }]}>Self-starters, last 6 weeks</Text>
                <View style={styles.chart} accessible accessibilityLabel={d.selfStarterWeeks.map((w) => `Week of ${w.label}: ${w.pct}%`).join('. ')}>
                  {d.selfStarterWeeks.map((w, i) => (
                    <View key={w.label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text style={[body(800), { fontSize: 11, color: C.ink }]}>{w.pct}%</Text>
                      <View style={{ width: '100%', height: Math.max(4, (w.pct / maxPct) * 74), backgroundColor: i === d.selfStarterWeeks.length - 1 ? C.fox : C.gold, borderRadius: 6 }} />
                    </View>
                  ))}
                </View>
                <Text style={[body(400), { fontSize: 12, color: C.muted }]}>{USING_MOCK_DATA ? 'Example data. ' : ''}Pilot pass mark is 40%.</Text>
              </View>
              <View style={styles.queue}>
                <Text accessibilityRole="header" style={[display(700), { fontSize: 20, color: C.cream }]}>Referral queue</Text>
                {d.referralQueue.map((r, i) => (
                  <View key={r.id} style={[styles.refRow, i < d.referralQueue.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.burrowEdge, paddingBottom: 8 }]}>
                    <Text style={[body(400), { fontSize: 14, color: C.cream, flex: 1 }]}>{r.label}</Text>
                    <Text style={[body(800), { fontSize: 14, color: r.highlight ? C.gold : C.creamMuted }]}>{r.status}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** Wide screens fit the table; narrow ones scroll it sideways inside its box. */
function TableScroll({ wide, children }: { wide: boolean; children: ReactNode }) {
  if (wide) return <>{children}</>;
  return <ScrollView horizontal>{children}</ScrollView>;
}

function Kpi({ label, value, sub, alert, subColor, subBold }: { label: string; value: string; sub: string; alert?: boolean; subColor?: string; subBold?: boolean }) {
  const fg = alert ? C.rustDeep : C.ink;
  return (
    <View style={[styles.kpi, alert && { backgroundColor: C.foxSoft, borderColor: C.foxLine }]}>
      <Text style={[body(800), { fontSize: 13, color: alert ? C.rustDeep : C.muted }]}>{label}</Text>
      <Text style={[display(800), { fontSize: 34, color: fg, fontVariant: ['tabular-nums'] }]}>{value}</Text>
      <Text style={[body(alert || subBold ? 700 : 400), { fontSize: 13, color: alert ? C.rustDeep : subColor ?? C.muted }]}>{sub}</Text>
    </View>
  );
}

const COLS = [{ flex: 1, minWidth: 90 }, { width: 64 }, { flex: 2.2, minWidth: 160 }, { width: 140 }, { width: 140 }];

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper, minHeight: '100%' },
  side: { backgroundColor: C.burrow, paddingVertical: 28, paddingHorizontal: 20 },
  sideItem: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 },
  main: { paddingVertical: 32, gap: 22 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  badge: { fontSize: 12, color: C.muted, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { flexGrow: 1, flexBasis: 180, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 18, gap: 4 },
  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 20 },
  tableHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderWidth: 1 },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  th: { fontSize: 12, color: C.muted, letterSpacing: 0.7, textTransform: 'uppercase', paddingVertical: 10, paddingHorizontal: 8 },
  td: { fontSize: 14, color: C.ink, paddingVertical: 12, paddingHorizontal: 8 },
  pill: { alignSelf: 'flex-start', fontSize: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden' },
  action: { borderWidth: 1.5, borderColor: C.rust, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120 },
  queue: { backgroundColor: C.burrow, borderRadius: 20, padding: 20, gap: 10 },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  refRowLight: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: C.lineSoft, paddingVertical: 10 },
});
