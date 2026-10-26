import React, { useState } from 'react';
import RidesNavbar from './RidesNavbar';
import RideBookingForm from './RideBookingForm';
import RiderBiddingModal from './RiderBiddingModal';
import ActiveTripCard from './ActiveTripCard';
import SchoolRunContractModal from './SchoolRunContractModal';
import { VEHICLE_TYPES, CORRIDORS } from './ridesData';
import './Rides.css';

export default function RidesApp({ onExitToLanding }) {
  const [activeTab, setActiveTab] = useState('book'); // 'book', 'active', 'contracts'
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeContracts, setActiveContracts] = useState([
    {
      id: 'SCH-CTR-9821',
      title: 'Maruwa Weekly School Shuttle',
      vehicleEmoji: '🛺',
      childrenNames: 'David & Stephanie Adeleke',
      schoolName: 'Corona School, Victoria Island',
      parentPhone: '+234 803 123 4567',
      homeAddress: 'Plot 8, Isaac John Street, Ikeja GRA',
      morningTime: '07:15',
      afternoonTime: '14:30',
      contractTerm: 'weekly',
      rateLocked: 22000,
      status: 'active',
      assignedDriver: 'Emmanuel Okon (TVS Deluxe · LND-889-BB · Guardian Cleared)',
      activeSince: 'Active this term'
    }
  ]);
  const [biddingTrip, setBiddingTrip] = useState(null);
  const [schoolModalData, setSchoolModalData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function handleRequestBids(tripData) {
    setBiddingTrip(tripData);
  }

  function handleAcceptBid(acceptedTrip) {
    setActiveTrips(prev => [acceptedTrip, ...prev]);
    setBiddingTrip(null);
    showToast(`Trip booked with ${acceptedTrip.assignedRider.name} for ₦${acceptedTrip.agreedFare.toLocaleString()}!`);
  }

  function handleCompleteTrip(tripId) {
    setActiveTrips(prev => prev.filter(t => t.id !== tripId));
    showToast('Trip completed successfully. Escrow funds released to rider!');
  }

  function handleActivateContract(newContract) {
    setActiveContracts(prev => [newContract, ...prev]);
    showToast(`School Run Contract activated for ${newContract.childrenNames}!`);
  }

  return (
    <div className="rd-root">
      {/* Toast */}
      {toastMessage && (
        <div className="rd-toast-notification key-fade">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <RidesNavbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeTripsCount={activeTrips.length}
        activeContractsCount={activeContracts.length}
        onOpenContractsModal={() => setSchoolModalData({})}
        onExitToLanding={onExitToLanding || (() => { window.location.href = '/'; })}
      />

      <main className="rd-main-content">
        {/* Hero Section */}
        <div className="rd-hero-container">
          <div className="rd-hero-banner">
            <div className="rd-hero-text-block">
              <span className="rd-hero-badge">
                <span>HYPERLOCAL TRANSIT & ERRANDS OS</span>
              </span>
              <h1 className="rd-hero-title">
                Order Okada, Maruwa & Taxis for Everyday Activities
              </h1>
              <p className="rd-hero-sub">
                Not just for shopping deliveries — hail a quick Okada to beat Lagos traffic, schedule a Maruwa by 4:00 PM, or set up a trusted weekly kids school run.
              </p>
            </div>

            <div className="rd-hero-vehicle-badges">
              <div className="rd-hero-pill okada">
                <span className="text-xl">🏍️</span>
                <div>
                  <strong>Okada Express</strong>
                  <span>Solo & Quick Parcels · From ₦700</span>
                </div>
              </div>
              <div className="rd-hero-pill maruwa">
                <span className="text-xl">🛺</span>
                <div>
                  <strong>Maruwa (Keke)</strong>
                  <span>Covered & School Runs · From ₦1,200</span>
                </div>
              </div>
              <div className="rd-hero-pill car">
                <span className="text-xl">🚗</span>
                <div>
                  <strong>Mini-Cab & Cars</strong>
                  <span>AC Comfort & Families · From ₦3,200</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Trips Section (If Any) */}
        {activeTrips.length > 0 && (
          <section className="rd-active-trips-section">
            <div className="rd-section-header">
              <span className="rd-live-dot" />
              <h3>Live Ongoing Trips ({activeTrips.length})</h3>
            </div>
            <div className="rd-active-trips-grid">
              {activeTrips.map(trip => (
                <ActiveTripCard
                  key={trip.id}
                  trip={trip}
                  onCompleteTrip={handleCompleteTrip}
                />
              ))}
            </div>
          </section>
        )}

        {/* Primary Booking Container */}
        <section className="rd-booking-section">
          <RideBookingForm
            onRequestBids={handleRequestBids}
            onOpenSchoolModal={(data) => setSchoolModalData(data)}
          />
        </section>

        {/* Active School Run Contracts Display */}
        {activeContracts.length > 0 && (
          <section className="rd-contracts-section">
            <div className="rd-section-header">
              <span className="text-xl">🎒</span>
              <h3>Active School Run Contracts ({activeContracts.length})</h3>
            </div>
            <div className="rd-contracts-grid">
              {activeContracts.map(ctr => (
                <div key={ctr.id} className="rd-contract-card">
                  <div className="rd-contract-top">
                    <span className="text-3xl">{ctr.vehicleEmoji}</span>
                    <div>
                      <strong className="rd-contract-title">{ctr.title}</strong>
                      <span className="rd-contract-kids">Children: {ctr.childrenNames}</span>
                    </div>
                    <span className="rd-contract-status-pill">{ctr.status.toUpperCase()}</span>
                  </div>

                  <div className="rd-contract-body">
                    <div className="rd-contract-info-item">
                      <span className="lbl">School:</span>
                      <strong>{ctr.schoolName}</strong>
                    </div>
                    <div className="rd-contract-info-item">
                      <span className="lbl">Pickup Time:</span>
                      <span>{ctr.morningTime} AM & {ctr.afternoonTime} PM</span>
                    </div>
                    <div className="rd-contract-info-item">
                      <span className="lbl">Dedicated Driver:</span>
                      <strong className="text-emerald-700">{ctr.assignedDriver}</strong>
                    </div>
                    <div className="rd-contract-info-item">
                      <span className="lbl">Escrow Rate:</span>
                      <span>₦{ctr.rateLocked.toLocaleString()} / {ctr.contractTerm}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Live Bidding Radar Modal */}
      {biddingTrip && (
        <RiderBiddingModal
          tripRequest={biddingTrip}
          onClose={() => setBiddingTrip(null)}
          onAcceptBid={handleAcceptBid}
        />
      )}

      {/* School Run Contract Modal */}
      {schoolModalData && (
        <SchoolRunContractModal
          isOpen={Boolean(schoolModalData)}
          onClose={() => setSchoolModalData(null)}
          initialData={schoolModalData}
          onActivateContract={handleActivateContract}
        />
      )}
    </div>
  );
}
