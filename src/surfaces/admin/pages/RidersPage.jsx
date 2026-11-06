import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, BadgeCheck, CheckCircle2, Eye, FileText, ImageOff, ShieldX, XCircle } from 'lucide-react';
import { licenceLabel, documentInfo, formatBytes } from '../../../lib/riderDocuments';
import {
  fetchRider, fetchRiders, getRiderDocumentUrl, reviewRiderDocument, reviewRiderKyc, setRiderSuspended
} from '../../../services/admin';
import {
  ActionDialog, Badge, DataTable, Dialog, ErrorBanner, FilterChips, KeyValues, Link, PageHeader, Panel, SearchBox,
  StatCard, Tabs, useAsync
} from '../ui';
import { VEHICLE_LABELS, count, dateOnly, dateTime, initials, money, shortId, statusLabel } from '../format';
import { Banknote, Bike, Package, Wallet } from 'lucide-react';

const KYC_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending_review', label: 'Needs review' },
  { value: 'not_started', label: 'Not submitted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'verified', label: 'Verified' },
  { value: 'suspended', label: 'Suspended' }
];

function ageFrom(dob) {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const diff = Date.now() - born.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function RidersPage({ navigate, refreshKey }) {
  const riders = useAsync(fetchRiders, [refreshKey]);
  const [filter, setFilter] = useState('all');
  const [vehicle, setVehicle] = useState('all');
  const [search, setSearch] = useState('');

  const all = riders.data || [];
  const matchesFilter = (r, value) => (value === 'all' ? true : value === 'suspended' ? r.suspended : r.kycStatus === value);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((r) => {
      if (!matchesFilter(r, filter)) return false;
      if (vehicle !== 'all' && r.vehicleType !== vehicle) return false;
      return !term || `${r.name} ${r.phone} ${r.email} ${r.plate} ${r.city}`.toLowerCase().includes(term);
    });
  }, [all, filter, vehicle, search]);

  return (
    <>
      <PageHeader title="Riders" subtitle="Couriers, their documents and verification. Open a rider to review their licence and vehicle papers." />
      <ErrorBanner message={riders.error} onRetry={riders.reload} />
      <div className="ad-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, phone, email, plate" />
        <select className="ad-select" style={{ width: 190 }} value={vehicle} onChange={(e) => setVehicle(e.target.value)} aria-label="Filter by vehicle">
          <option value="all">All vehicles</option>
          {Object.entries(VEHICLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="ad-toolbar">
        <FilterChips value={filter} onChange={setFilter} options={KYC_FILTERS.map((f) => ({ ...f, count: all.filter((r) => matchesFilter(r, f.value)).length }))} />
      </div>
      <Panel flush>
        <DataTable
          loading={riders.loading && !riders.data}
          rows={rows}
          onRowClick={(r) => navigate(`/riders/${r.id}`)}
          empty={{ title: 'No riders match', text: 'Riders appear here after they sign up on the rider app.' }}
          columns={[
            { key: 'name', header: 'Rider', render: (r) => <><div className="ad-cell-main">{r.name || 'Unnamed rider'}</div><div className="ad-cell-sub">{r.phone || r.email || '—'}</div></> },
            { key: 'vehicle', header: 'Vehicle', render: (r) => <><div>{VEHICLE_LABELS[r.vehicleType] || r.vehicleType}</div><div className="ad-cell-sub ad-mono">{r.plate || 'No plate'}</div></> },
            { key: 'where', header: 'Base', render: (r) => [r.city, r.state].filter(Boolean).join(', ') || '—' },
            { key: 'docs', header: 'Documents', render: (r) => <><div className="ad-mono">{r.docsUploaded}/{r.docsRequired} uploaded</div><div className="ad-cell-sub">{r.docsApproved} approved</div></> },
            { key: 'kyc', header: 'Verification', render: (r) => (
              <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge status={r.kycStatus} tone={r.kycStatus === 'not_started' ? 'idle' : undefined}>{r.kycStatus === 'not_started' ? 'Not submitted' : undefined}</Badge>
                {r.suspended && <Badge tone="bad">Suspended</Badge>}
              </span>
            ) },
            { key: 'trips', header: 'Deliveries', align: 'right', render: (r) => <span className="ad-mono">{count(r.deliveries)}</span> },
            { key: 'earned', header: 'Earned', align: 'right', render: (r) => <span className="ad-mono">{money(r.earned)}</span> },
            { key: 'joined', header: 'Joined', render: (r) => dateOnly(r.createdAt) }
          ]}
        />
      </Panel>
    </>
  );
}

/** Thumbnail that fetches a short-lived signed URL for a private document. */
function DocumentPreview({ doc, onOpen }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const isImage = doc.mimeType?.startsWith('image/');

  useEffect(() => {
    let alive = true;
    setFailed(false);
    getRiderDocumentUrl(doc.path)
      .then((signed) => alive && setUrl(signed))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [doc.path, doc.uploadedAt]);

  return (
    <button type="button" className="ad-doc-thumb" onClick={() => url && onOpen(url)} disabled={!url} aria-label={`Open ${doc.fileName}`}>
      {failed ? <ImageOff size={26} /> : !url ? <span className="ad-skel" style={{ width: '100%', height: '100%' }} /> : isImage ? <img src={url} alt={doc.fileName} loading="lazy" /> : <FileText size={34} />}
    </button>
  );
}

export function RiderDetailPage({ navigate, notify, riderId, refreshKey, onChanged }) {
  const rider = useAsync(() => fetchRider(riderId), [riderId, refreshKey]);
  const [tab, setTab] = useState('documents');
  const [dialog, setDialog] = useState(null);
  const [viewer, setViewer] = useState(null);
  const r = rider.data;

  const afterChange = (message) => {
    notify(message);
    rider.reload({ silent: true });
    onChanged?.();
  };

  const required = r ? r.requiredDocuments : [];
  const docsByType = r ? Object.fromEntries(r.documents.map((d) => [d.docType, d])) : {};
  const allApproved = r ? required.every((type) => docsByType[type]?.status === 'approved') : false;
  const age = r ? ageFrom(r.dateOfBirth) : null;
  const licenceExpired = r?.licenseExpiry && new Date(r.licenseExpiry) < new Date();

  return (
    <>
      <PageHeader
        back={{ to: '/riders', label: 'All riders' }} navigate={navigate}
        title={r ? r.name || 'Unnamed rider' : 'Rider'}
        subtitle={r ? `${VEHICLE_LABELS[r.vehicleType] || r.vehicleType} · #${shortId(r.id)}` : undefined}
        actions={r && (
          <>
            <Badge status={r.kycStatus} tone={r.kycStatus === 'not_started' ? 'idle' : undefined}>{r.kycStatus === 'not_started' ? 'Not submitted' : undefined}</Badge>
            {r.suspended && <Badge tone="bad">Suspended</Badge>}
            {r.kycStatus !== 'verified' && r.submissionId && (
              <button type="button" className="ad-btn ad-btn-ok ad-btn-sm" disabled={!allApproved} title={allApproved ? '' : 'Approve every required document first'} onClick={() => setDialog({ kind: 'verify' })}>
                <BadgeCheck size={14} /> Verify rider
              </button>
            )}
            {r.kycStatus !== 'rejected' && r.submissionId && (
              <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => setDialog({ kind: 'reject' })}><XCircle size={14} /> Reject application</button>
            )}
            {r.suspended ? (
              <button type="button" className="ad-btn ad-btn-sm" onClick={() => setDialog({ kind: 'reinstate' })}>Reinstate</button>
            ) : (
              <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => setDialog({ kind: 'suspend' })}><Ban size={14} /> Suspend</button>
            )}
          </>
        )}
      />
      <ErrorBanner message={rider.error} onRetry={rider.reload} />

      {r && (
        <>
          {r.suspended && (
            <div className="ad-error" role="alert"><ShieldX size={18} /> Suspended {dateOnly(r.suspendedAt)}: {r.suspensionReason || 'no reason recorded'}</div>
          )}
          {r.kycStatus === 'rejected' && r.reviewerNotes && (
            <div className="ad-error" role="alert"><AlertTriangle size={18} /> Sent back to the rider: {r.reviewerNotes}</div>
          )}

          <div className="ad-grid ad-grid-4" style={{ marginBottom: 18 }}>
            <StatCard label="Deliveries" icon={Package} value={r.deliveries} delay={0} />
            <StatCard label="Total earned" icon={Wallet} tint="#dcfce7" color="#15803d" value={r.earned} format={money} delay={60} />
            <StatCard label="Paid out" icon={Banknote} tint="#fef3c7" color="#b45309" value={r.paidOut} format={money} delay={120} />
            <StatCard label="Available balance" icon={Bike} tint="#ede9fe" color="#6d28d9" value={r.availableBalance} format={money} delay={180} />
          </div>

          <div className="ad-grid ad-grid-main">
            <div className="ad-stack">
              <Tabs active={tab} onChange={setTab} tabs={[
                { id: 'documents', label: 'Documents', count: `${r.documents.length}/${required.length}` },
                { id: 'trips', label: 'Recent deliveries', count: r.recentTrips.length },
                { id: 'payouts', label: 'Payouts', count: r.payouts.length }
              ]} />

              {tab === 'documents' && (
                <>
                  <p className="ad-note" style={{ margin: '-6px 0 4px' }}>
                    {r.vehicleType === 'bicycle'
                      ? 'Bicycle riders only need a passport photo.'
                      : `For a ${VEHICLE_LABELS[r.vehicleType]?.toLowerCase() || r.vehicleType}: ${licenceLabel(r.vehicleType).toLowerCase()} (front and back), vehicle papers and a passport photo. `}
                    Links are private and expire after 5 minutes.
                  </p>
                  <div className="ad-grid ad-grid-2">
                    {required.map((type) => {
                      const doc = docsByType[type];
                      const info = documentInfo(type, r.vehicleType);
                      if (!doc) {
                        return (
                          <div key={type} className="ad-doc">
                            <div className="ad-doc-thumb" style={{ cursor: 'default' }}><ImageOff size={26} /></div>
                            <div className="ad-doc-body">
                              <div className="ad-doc-title"><span>{info.label}</span><Badge tone="idle">Not uploaded</Badge></div>
                              <div className="ad-doc-meta">The rider has not uploaded this yet.</div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={type} className="ad-doc">
                          <DocumentPreview doc={doc} onOpen={(url) => setViewer({ url, doc, label: info.label })} />
                          <div className="ad-doc-body">
                            <div className="ad-doc-title"><span>{info.label}</span><Badge status={doc.status} /></div>
                            <div className="ad-doc-meta">{doc.fileName} · {formatBytes(doc.sizeBytes)} · uploaded {dateTime(doc.uploadedAt)}</div>
                            {doc.notes && <div className="ad-doc-meta" style={{ color: '#b91c1c', fontWeight: 600 }}>Note: {doc.notes}</div>}
                            <div className="ad-doc-actions">
                              <button type="button" className="ad-btn ad-btn-sm" onClick={async () => {
                                try { setViewer({ url: await getRiderDocumentUrl(doc.path), doc, label: info.label }); } catch (err) { notify(err.message, 'bad'); }
                              }}><Eye size={13} /> View</button>
                              {doc.status !== 'approved' && (
                                <button type="button" className="ad-btn ad-btn-ok ad-btn-sm" onClick={() => setDialog({ kind: 'doc-approve', doc, label: info.label })}><CheckCircle2 size={13} /> Approve</button>
                              )}
                              {doc.status !== 'rejected' && (
                                <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => setDialog({ kind: 'doc-reject', doc, label: info.label })}><XCircle size={13} /> Reject</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {tab === 'trips' && (
                <Panel flush>
                  <DataTable rows={r.recentTrips} onRowClick={(t) => navigate(`/orders/${t.id}`)} empty={{ title: 'No deliveries yet' }} columns={[
                    { key: 'id', header: 'Order', render: (t) => <span className="ad-mono ad-cell-main">#{shortId(t.id)}</span> },
                    { key: 'store', header: 'Store → customer', render: (t) => <><div>{t.storeName}</div><div className="ad-cell-sub">{t.customerName} · {t.address}</div></> },
                    { key: 'status', header: 'Status', render: (t) => <Badge status={t.status} /> },
                    { key: 'pay', header: 'Fare + tip', align: 'right', render: (t) => <span className="ad-mono">{money(Number(t.fare) + Number(t.tip))}</span> },
                    { key: 'time', header: 'Date', render: (t) => dateTime(t.createdAt) }
                  ]} />
                </Panel>
              )}

              {tab === 'payouts' && (
                <Panel flush>
                  <DataTable rows={r.payouts} empty={{ title: 'No payout requests yet' }} columns={[
                    { key: 'amt', header: 'Amount', render: (p) => <span className="ad-mono ad-cell-main">{money(p.amount)}</span> },
                    { key: 'bank', header: 'Bank account', render: (p) => <><div>{p.bankName}</div><div className="ad-cell-sub ad-mono">{p.accountNumber}</div></> },
                    { key: 'st', header: 'Status', render: (p) => <Badge status={p.status} /> },
                    { key: 'time', header: 'Requested', render: (p) => dateTime(p.createdAt) }
                  ]} />
                  <p className="ad-note" style={{ padding: '0 20px 16px' }}>Settle payouts from the <Link to="/payouts" navigate={navigate} style={{ color: 'var(--primary)' }}>Payouts</Link> page.</p>
                </Panel>
              )}
            </div>

            <div className="ad-stack">
              <Panel title="Rider profile">
                <div className="ad-profile" style={{ marginBottom: 16 }}>
                  <div className="ad-avatar">{initials(r.name)}</div>
                  <div><div className="ad-cell-main">{r.name || 'Unnamed rider'}</div><div className="ad-cell-sub">Joined {dateOnly(r.createdAt)}</div></div>
                </div>
                <KeyValues items={[
                  ['Phone', r.phone], ['Email', r.email],
                  ['Date of birth', r.dateOfBirth ? `${dateOnly(r.dateOfBirth)}${age !== null ? ` (${age} yrs)` : ''}` : null],
                  ['Delivery area', r.corridor],
                  ['Status', <Badge key="on" tone={r.isOnline ? 'ok' : 'idle'}>{r.isOnline ? 'Online now' : 'Offline'}</Badge>],
                  ['Base area', [r.baseAddress, r.city, r.state].filter(Boolean).join(', '), true]
                ]} />
              </Panel>
              <Panel title="Vehicle & licence">
                <KeyValues items={[
                  ['Vehicle', VEHICLE_LABELS[r.vehicleType] || r.vehicleType], ['Make / model', r.vehicleMakeModel],
                  ['Plate number', r.plate ? <span key="p" className="ad-mono">{r.plate}</span> : null],
                  [licenceLabel(r.vehicleType), r.licenseNumber ? <span key="l" className="ad-mono">{r.licenseNumber}</span> : (r.vehicleType === 'bicycle' ? 'Not required' : null)],
                  ['Licence expiry', r.licenseExpiry ? <span key="e" style={{ color: licenceExpired ? '#b91c1c' : undefined }}>{dateOnly(r.licenseExpiry)}{licenceExpired ? ' — expired' : ''}</span> : null]
                ]} />
              </Panel>
              <Panel title="Guarantor & next of kin">
                <KeyValues items={[
                  ['Guarantor', r.guarantorName], ['Guarantor phone', r.guarantorPhone],
                  ['Next of kin', r.nextOfKinName], ['Next of kin phone', r.nextOfKinPhone]
                ]} />
              </Panel>
              <Panel title="Payout account" subtitle="Where this rider's earnings are sent">
                {r.payoutAccount ? (
                  <KeyValues items={[
                    ['Bank', r.payoutAccount.bankName],
                    ['Account number', <span key="n" className="ad-mono">{r.payoutAccount.accountNumber}</span>],
                    ['Account name', r.payoutAccount.accountName],
                    ['Verified', <Badge key="v" tone={r.payoutAccount.verified ? 'ok' : 'warn'}>{r.payoutAccount.verified ? 'Verified' : 'Not verified'}</Badge>]
                  ]} />
                ) : <p className="ad-note" style={{ margin: 0 }}>The rider has not added a payout account.</p>}
              </Panel>
              <Panel title="Verification">
                <KeyValues items={[
                  ['Onboarding', <Badge key="o" status={r.onboardingStatus} />],
                  ['Documents', <Badge key="k" status={r.kycStatus} tone={r.kycStatus === 'not_started' ? 'idle' : undefined}>{r.kycStatus === 'not_started' ? 'Not submitted' : undefined}</Badge>],
                  ['Submitted', dateTime(r.submittedAt)], ['Reviewed', dateTime(r.reviewedAt)],
                  ['Reviewer notes', r.reviewerNotes, true]
                ]} />
              </Panel>
            </div>
          </div>
        </>
      )}

      {viewer && (
        <Dialog wide label={viewer.label} onClose={() => setViewer(null)}>
          <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
            <strong>{viewer.label}</strong>
            <span style={{ display: 'inline-flex', gap: 8 }}>
              <a className="ad-btn ad-btn-sm" href={viewer.url} target="_blank" rel="noreferrer">Open in new tab</a>
              <button type="button" className="ad-btn ad-btn-sm" onClick={() => setViewer(null)}>Close</button>
            </span>
          </div>
          <div style={{ background: '#0b1220', display: 'grid', placeItems: 'center', maxHeight: '75vh', overflow: 'auto' }}>
            {viewer.doc.mimeType === 'application/pdf'
              ? <iframe title={viewer.label} src={viewer.url} style={{ width: '100%', height: '75vh', border: 0 }} />
              : <img src={viewer.url} alt={viewer.label} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />}
          </div>
        </Dialog>
      )}

      {dialog?.kind === 'doc-approve' && (
        <ActionDialog title={`Approve ${dialog.label}?`} description="Confirm the document is clear, valid and matches the rider's details." tone="ok" confirmLabel="Approve document"
          onClose={() => setDialog(null)}
          onConfirm={async () => { await reviewRiderDocument(dialog.doc.id, 'approved'); afterChange(`${dialog.label} approved.`); }} />
      )}
      {dialog?.kind === 'doc-reject' && (
        <ActionDialog title={`Reject ${dialog.label}?`} description="The rider will see your reason and must upload a replacement. Their application goes back to them." tone="danger" confirmLabel="Reject document"
          inputLabel="Reason shown to the rider" inputRequired inputPlaceholder="e.g. The photo is blurry — please retake it in good light."
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => { await reviewRiderDocument(dialog.doc.id, 'rejected', reason); afterChange(`${dialog.label} rejected.`); }} />
      )}
      {dialog?.kind === 'verify' && (
        <ActionDialog title="Verify this rider?" description="They will be able to go online and take deliveries straight away." tone="ok" confirmLabel="Verify rider"
          inputLabel="Internal note (optional)" onClose={() => setDialog(null)}
          onConfirm={async (note) => { await reviewRiderKyc(r.submissionId, 'verified', note); afterChange(`${r.name} is verified.`); }} />
      )}
      {dialog?.kind === 'reject' && (
        <ActionDialog title="Reject this application?" description="The rider is sent back to the document screen and sees your reason." tone="danger" confirmLabel="Reject application"
          inputLabel="Reason shown to the rider" inputRequired onClose={() => setDialog(null)}
          onConfirm={async (reason) => { await reviewRiderKyc(r.submissionId, 'rejected', reason); afterChange('Application rejected.'); }} />
      )}
      {dialog?.kind === 'suspend' && (
        <ActionDialog title={`Suspend ${r?.name}?`} description="They cannot take deliveries until reinstated. Open deliveries are not reassigned automatically." tone="danger" confirmLabel="Suspend rider"
          inputLabel="Reason" inputRequired onClose={() => setDialog(null)}
          onConfirm={async (reason) => { await setRiderSuspended(r.id, true, reason); afterChange(`${r.name} suspended.`); }} />
      )}
      {dialog?.kind === 'reinstate' && (
        <ActionDialog title={`Reinstate ${r?.name}?`} description="They can take deliveries again if their documents are verified." tone="ok" confirmLabel="Reinstate"
          onClose={() => setDialog(null)}
          onConfirm={async () => { await setRiderSuspended(r.id, false); afterChange(`${r.name} reinstated.`); }} />
      )}
    </>
  );
}
