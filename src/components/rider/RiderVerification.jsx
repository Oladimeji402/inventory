import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileUp,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
  UploadCloud
} from 'lucide-react';
import BrandMark from '../../shared/components/BrandMark';
import {
  DOCUMENT_ACCEPT,
  documentInfo,
  formatBytes,
  licenceLabel,
  requiredDocumentTypes,
  validateDocumentFile
} from '../../lib/riderDocuments';
import { fetchMyVerification, submitVerification, uploadRiderDocument } from '../../services/riderVerification';
import './RiderVerification.css';

const STATUS_COPY = {
  none: { label: 'Not uploaded', tone: 'idle' },
  pending: { label: 'Uploaded', tone: 'info' },
  approved: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Rejected — replace it', tone: 'bad' }
};

function DocumentSlot({ docType, vehicleType, doc, busy, locked, onPick }) {
  const inputRef = useRef(null);
  const info = documentInfo(docType, vehicleType);
  const state = doc ? doc.status : 'none';
  const copy = STATUS_COPY[state] || STATUS_COPY.none;

  return (
    <div className={`rv-slot rv-slot-${copy.tone}`}>
      <div className="rv-slot-head">
        <strong>{info.label}</strong>
        <span className={`rv-pill rv-pill-${copy.tone}`}>
          {state === 'approved' && <CheckCircle2 size={12} />}
          {state === 'rejected' && <AlertCircle size={12} />}
          {copy.label}
        </span>
      </div>
      <p className="rv-slot-help">{info.help}</p>

      {doc && (
        <p className="rv-file">
          <FileUp size={13} />
          <span>{doc.fileName}</span>
          <em>{formatBytes(doc.sizeBytes)}</em>
        </p>
      )}
      {doc?.status === 'rejected' && doc.notes && (
        <p className="rv-note" role="alert">
          <AlertCircle size={13} />
          <span>{doc.notes}</span>
        </p>
      )}

      {!locked && state !== 'approved' && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            capture={docType === 'passport_photo' ? 'user' : undefined}
            className="rv-file-input"
            aria-label={`Upload ${info.label}`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onPick(docType, file);
            }}
          />
          <button
            type="button"
            className="rv-upload-btn"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 size={15} className="rv-spin" /> : <UploadCloud size={15} />}
            <span>{busy ? 'Uploading…' : doc ? 'Replace file' : 'Choose file'}</span>
          </button>
        </>
      )}
    </div>
  );
}

export default function RiderVerification({ userId, rider, riderName, onRefresh, onSignOut }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setState(await fetchMyVerification());
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your verification status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const vehicleType = state?.vehicleType || rider?.vehicle_type || 'motorcycle';
  const required = state?.required || requiredDocumentTypes(vehicleType);
  const docs = Object.fromEntries((state?.documents || []).map((doc) => [doc.docType, doc]));
  const kycStatus = state?.kycStatus || rider?.kyc_status || 'not_started';
  const suspended = Boolean(state?.suspended || rider?.suspended_at);

  const allPresent = required.every((type) => docs[type]);
  const anyRejected = required.some((type) => docs[type]?.status === 'rejected');
  const locked = kycStatus === 'pending_review' || kycStatus === 'verified';

  const handlePick = async (docType, file) => {
    setError('');
    const problem = validateDocumentFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusyType(docType);
    try {
      await uploadRiderDocument(userId, docType, file);
      await load();
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setBusyType('');
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await submitVerification();
      await load();
      await onRefresh?.();
    } catch (err) {
      setError(err.message || 'Could not send your documents for review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await load();
    await onRefresh?.();
  };

  return (
    <div className="rv-page">
      <header className="rv-top">
        <BrandMark />
        <button type="button" className="rv-ghost" onClick={onSignOut}>
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </header>

      <main className="rv-card">
        {suspended ? (
          <div className="rv-banner rv-banner-bad" role="alert">
            <ShieldAlert size={22} />
            <div>
              <strong>Your rider account is suspended</strong>
              <p>{state?.suspensionReason || 'Contact support to find out why and how to get back on the road.'}</p>
            </div>
          </div>
        ) : kycStatus === 'pending_review' ? (
          <div className="rv-banner rv-banner-info">
            <Clock size={22} />
            <div>
              <strong>Documents sent — waiting for review</strong>
              <p>A team member is checking your documents. You can start taking deliveries as soon as you are approved.</p>
            </div>
          </div>
        ) : kycStatus === 'rejected' ? (
          <div className="rv-banner rv-banner-bad" role="alert">
            <AlertCircle size={22} />
            <div>
              <strong>We could not approve your documents</strong>
              <p>{state?.reviewerNotes || 'Replace the rejected documents below and send them again.'}</p>
            </div>
          </div>
        ) : (
          <div className="rv-banner rv-banner-brand">
            <BadgeCheck size={22} />
            <div>
              <strong>{riderName ? `Welcome, ${riderName}. ` : ''}Verify your documents to start riding</strong>
              <p>
                {vehicleType === 'bicycle'
                  ? 'Upload a passport photo. Bicycle riders do not need a licence.'
                  : `Because you ride a ${vehicleType === 'tricycle' ? 'tricycle (keke)' : vehicleType}, we need your ${licenceLabel(vehicleType).toLowerCase()}, vehicle papers and a photo.`}
              </p>
            </div>
          </div>
        )}

        <h1 className="rv-title">Verification documents</h1>
        <p className="rv-lead">JPG, PNG, WebP or PDF, up to 5 MB each. Files are stored privately and only our verification team can open them.</p>

        {loading && !state ? (
          <div className="rv-loading"><Loader2 size={20} className="rv-spin" /> Loading…</div>
        ) : (
          <div className="rv-grid">
            {required.map((docType) => (
              <DocumentSlot
                key={docType}
                docType={docType}
                vehicleType={vehicleType}
                doc={docs[docType]}
                busy={busyType === docType}
                locked={locked || suspended}
                onPick={handlePick}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rv-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="rv-actions">
          {locked || suspended ? (
            <button type="button" className="rv-secondary" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'rv-spin' : ''} />
              <span>Check status</span>
            </button>
          ) : (
            <button
              type="button"
              className="rv-primary"
              disabled={!allPresent || anyRejected || submitting || Boolean(busyType)}
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 size={15} className="rv-spin" /> : <CheckCircle2 size={15} />}
              <span>{submitting ? 'Sending…' : 'Send for review'}</span>
            </button>
          )}
          {!locked && !suspended && !allPresent && (
            <span className="rv-hint">Upload all {required.length} document{required.length === 1 ? '' : 's'} to continue.</span>
          )}
          {!locked && !suspended && allPresent && anyRejected && (
            <span className="rv-hint">Replace the rejected documents first.</span>
          )}
        </div>
      </main>
    </div>
  );
}
