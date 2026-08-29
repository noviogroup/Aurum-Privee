"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  CreditCard,
  Database,
  EnvelopeSimple,
  GlobeHemisphereWest,
  ImageSquare,
  LockKey,
  Package,
  PlugsConnected,
  ShieldCheck,
  SignOut,
  Storefront,
  Tag,
  Users,
  WarningCircle,
} from "@phosphor-icons/react";
import type { IntegrationId, OperationsIntegration, OperationsReadiness } from "@/lib/operations-integration-types";

const serviceIcons = {
  loyverse: Storefront,
  database: Database,
  payments: CreditCard,
  email: EnvelopeSimple,
  domain: GlobeHemisphereWest,
  security: ShieldCheck,
};

function statusIcon(service: OperationsIntegration) {
  return service.state === "ready" ? <CheckCircle size={17} weight="fill" /> : <WarningCircle size={17} weight="fill" />;
}

export function OperationsIntegrationsConsole({ initialReadiness }: { initialReadiness: OperationsReadiness }) {
  const [readiness, setReadiness] = useState(initialReadiness);
  const [selectedId, setSelectedId] = useState<IntegrationId>("loyverse");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = readiness.services.find((item) => item.id === selectedId) || readiness.services[0];
  const percentage = Math.round((readiness.ready / Math.max(1, readiness.total)) * 100);

  async function runChecks() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/operations/integrations", { method: "POST" });
      const body = await response.json() as OperationsReadiness & { error?: string };
      if (!response.ok) throw new Error(body.error || "Live checks could not be completed");
      setReadiness(body);
      setNotice(`Live checks completed at ${new Intl.DateTimeFormat("en-BS", { hour: "numeric", minute: "2-digit" }).format(new Date(body.checkedAt))}.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Live checks could not be completed");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/operations/session", { method: "DELETE" });
    window.location.assign("/operations/login");
  }

  return (
    <div className="operations-app operations-integrations-app">
      <aside className="operations-sidebar">
        <div className="operations-wordmark">AURUM PRIVÉE</div>
        <p className="operations-rail-label">Operations</p>
        <nav aria-label="Operations navigation">
          <Link href="/operations"><Package size={21} weight="light" />Orders</Link>
          <Link href="/operations/inquiries"><EnvelopeSimple size={21} weight="light" />Client care</Link>
          <Link href="/operations/catalog"><Tag size={21} weight="light" />Catalog</Link>
          <Link href="/operations/images"><ImageSquare size={21} weight="light" />Product images</Link>
          <Link className="is-selected" href="/operations/integrations"><PlugsConnected size={21} weight="light" />Integrations</Link>
          <Link href="/operations/customers"><Users size={21} weight="light" />Customers</Link>
        </nav>
        <div className="operations-rail-utilities">
          <a href="/" target="_blank" rel="noreferrer"><ArrowSquareOut size={20} weight="light" />View storefront</a>
          <button type="button" onClick={signOut}><SignOut size={20} weight="light" />Sign out</button>
        </div>
      </aside>

      <section className="operations-workspace">
        <header className="operations-topbar">
          <div><Storefront size={18} weight="light" /><span>Nassau store</span></div>
          <div className="operations-sync"><span>Launch readiness</span>{readiness.ready === readiness.total ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}{readiness.ready} of {readiness.total}</div>
        </header>
        <div className="operations-page-head operations-integrations-page-head">
          <h1>Integrations</h1>
          <p>See what is connected, what needs attention, and what is required before launch.</p>
        </div>

        <div className="operations-frame operations-integrations-frame">
          <section className="operations-queue operations-integration-list">
            <div className="operations-readiness-band">
              <strong>{readiness.ready} of {readiness.total} ready</strong>
              <span aria-hidden="true"><i style={{ transform: `scaleX(${percentage / 100})` }} /></span>
              <b>{percentage}%</b>
            </div>
            {readiness.services.map((service) => {
              const Icon = serviceIcons[service.id];
              return (
                <button key={service.id} type="button" className={selected.id === service.id ? "is-selected" : ""} onClick={() => setSelectedId(service.id)}>
                  <span className="operations-integration-icon"><Icon size={29} weight="light" /></span>
                  <span className="operations-integration-copy"><strong>{service.name}</strong><small>{service.summary}</small></span>
                  <span className={`operations-integration-state is-${service.state}`}>{statusIcon(service)}{service.status}</span>
                  <ArrowRight size={18} weight="light" />
                </button>
              );
            })}
          </section>

          <aside className="operations-inspector operations-integration-inspector" aria-live="polite">
            <div className="operations-integration-title"><h2>{selected.name}</h2><p className={`is-${selected.state}`}>{statusIcon(selected)}{selected.connection}</p></div>
            <dl className="operations-integration-facts">
              {selected.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
            </dl>
            <section id="integration-requirements" className="operations-integration-requirements">
              <h3>{selected.requirements.length ? "Required before launch" : "Launch requirements"}</h3>
              {selected.requirements.length ? <ul>{selected.requirements.map((item) => <li key={item}><span />{item}</li>)}</ul> : <div className="operations-integration-clear"><CheckCircle size={21} weight="fill" />No outstanding requirements for this service.</div>}
            </section>
            {notice && <div className="operations-integration-notice" role="status">{notice}</div>}
            <div className="operations-integration-actions">
              <button type="button" className="operations-primary-button" disabled={busy} onClick={runChecks}>{busy ? "Running checks" : "Run live checks"}</button>
              <a href="#integration-requirements">Open setup guide <ArrowRight size={16} /></a>
            </div>
            <p className="operations-secret-note"><LockKey size={15} weight="light" />Secret values are never shown or returned to the browser.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
