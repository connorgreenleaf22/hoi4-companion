import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, ArrowRight, Shield, Factory, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { Entry, Profile } from './types';
import { api } from './api';
import { PageTitle, number } from './App';
import { declaredYear } from './year';

type Row = { id: string; count: number | '' };
type ProductionLine = { equipment: string; quantity: string; stockpile: string; factories: string; efficiency: string; output: string; resourceFactor: string };
type KeyedResult = { key: string; value?: any; error?: string };
const productionFields = [
  { key: 'quantity', label: 'Equipment needed', step: 1 },
  { key: 'stockpile', label: 'Available stockpile', step: 1 },
  { key: 'factories', label: 'Military factories', step: 1, max: 10000 },
  { key: 'efficiency', label: 'Efficiency factor (0–1)', step: .05, max: 1 },
  { key: 'output', label: 'Factory output factor', step: .05 },
  { key: 'resourceFactor', label: 'Resource / disruption factor (0–1)', step: .05, max: 1 },
] as const;

export function DivisionLab({ profile, save, fail, notify, openEntry, baseFactory, indexRevision }: { profile?: Profile; save: (p: Profile) => Promise<Profile>; fail: (e: unknown) => void; notify: (s: string) => void; openEntry: (uid: string) => void; baseFactory?: number; indexRevision?:string }) {
  const [units, setUnits] = useState<Entry[]>([]);
  const [equipment, setEquipment] = useState<Entry[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadedIndexRevision,setLoadedIndexRevision]=useState<string>();
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<Row[]>([{ id: 'infantry', count: 9 }]);
  const [divisions, setDivisions] = useState('24');
  const [name, setName] = useState('Infantry division');
  const [calculation, setCalculation] = useState<KeyedResult>();
  const [compare, setCompare] = useState<any>();
  const [compareName, setCompareName] = useState('');
  const [templateBusy, setTemplateBusy] = useState(false);
  const [a, setA] = useState('infantry_equipment_1');
  const [b, setB] = useState('infantry_equipment_2');
  const [line, setLine] = useState<ProductionLine>({ equipment: 'infantry_equipment_1', quantity: '21600', stockpile: '0', factories: '10', efficiency: '.5', output: '1', resourceFactor: '1' });
  const [productionResponse, setProductionResponse] = useState<KeyedResult>();

  useEffect(() => {
    let live = true;
    setLoadState('loading');
    Promise.all([api<Entry[]>('units'), api<Entry[]>('equipment')]).then(([u, e]) => {
      if (!live) return;
      setUnits(u.filter(unit => 'combat_width' in (unit.data.stats || {})));
      setEquipment(e);
      setLoadedIndexRevision(indexRevision);
      setLoadState('ready');
      setLoadError('');
    }).catch(error => {
      if (live) { setLoadState('error'); setLoadError(error.message); }
    });
    return () => { live = false; };
  }, [reload,indexRevision]);
  const referenceReady=loadState==='ready'&&loadedIndexRevision===indexRevision;

  const divisionCount = Number(divisions);
  const templateInputError = !divisions.trim() ? 'Enter the number of divisions.'
    : !Number.isInteger(divisionCount) || divisionCount < 1 || divisionCount > 10000 ? 'Divisions must be a whole number from 1 to 10,000.'
    : rows.some(row => row.count === '') ? 'Enter a count for every unit row.' : '';
  const calculationKey = JSON.stringify({ rows, divisions, indexRevision });
  useEffect(() => {
    if (templateInputError) return;
    let live = true;
    api('calculate', { rows, divisions: divisionCount }).then(value => {
      if (live) setCalculation({ key: calculationKey, value });
    }).catch(error => {
      if (live) setCalculation({ key: calculationKey, error: error.message });
    });
    return () => { live = false; };
  }, [calculationKey, templateInputError]);
  const result = referenceReady && !templateInputError && calculation?.key === calculationKey ? calculation.value : undefined;
  const calculationError = templateInputError || (calculation?.key === calculationKey ? calculation.error : '');

  const item = referenceReady?equipment.find(entry => entry.id === line.equipment):undefined;
  const cost = item?.data.resolvedStats?.build_cost_ic;
  const support = item?.data.productionSupport as { supported: boolean; reason?: string } | undefined;
  const invalidField = productionFields.find(field => {
    const value = line[field.key];
    const numeric = Number(value);
    return !value.trim() || !Number.isFinite(numeric) || numeric < 0
      || ('max' in field && numeric > field.max)
      || (field.key === 'factories' && !Number.isInteger(numeric));
  });
  const productionBlock = loadState === 'error' ? 'Equipment data could not be loaded. Retry loading before estimating production.'
    : !referenceReady ? 'Loading equipment data…'
    : !item ? 'Select equipment with an installed definition to estimate production.'
    : support?.supported === false ? support.reason || 'Production for this equipment is unsupported in this release.'
    : !Number.isFinite(cost) || cost <= 0 ? 'Equipment cost is unresolved in the installed data. No production estimate is available.'
    : !Number.isFinite(baseFactory) || (baseFactory ?? 0) <= 0 ? 'Military factory base output is missing from the installed data. Refresh game data in Sources & settings.'
    : invalidField ? `Enter a valid ${invalidField.label.toLowerCase()}${'max' in invalidField ? ` between 0 and ${number(invalidField.max)}` : ' of 0 or more'}${invalidField.key === 'factories' ? ' (whole factories)' : ''}.` : '';
  const productionKey = JSON.stringify({ line, cost, support, baseFactory, loadState, indexRevision });
  useEffect(() => {
    if (productionBlock) return;
    let live = true;
    const input = Object.fromEntries(productionFields.map(field => [field.key, Number(line[field.key])]));
    api('production', { ...input, equipmentId: line.equipment }).then(value => {
      if (live) setProductionResponse({ key: productionKey, value });
    }).catch(error => {
      if (live) setProductionResponse({ key: productionKey, error: error.message });
    });
    return () => { live = false; };
  }, [productionKey, productionBlock]);
  // A response belongs to one exact input snapshot. Edits hide it during render,
  // before effects run, and a late response can never become the current result.
  const production = !productionBlock && productionResponse?.key === productionKey ? productionResponse.value : undefined;
  const productionError = !productionBlock && productionResponse?.key === productionKey ? productionResponse.error : '';
  const productionPending = !productionBlock && !production && !productionError;
  const updateRow = (index: number, patch: Partial<Row>) => setRows(previous => previous.map((row, i) => i === index ? { ...row, ...patch } : row));
  const saved = profile?.templates || [];
  const comparison=compare?.indexRevision===indexRevision?compare?.value:undefined;
  const statCards = [{ label: 'COMBAT WIDTH', value: result?.width, key: 'width' }, { label: 'MANPOWER / DIVISION', value: result?.manpower, key: 'manpower' }, { label: 'BASE ORGANIZATION', value: result?.organization, key: 'organization' }, { label: 'BASE SUPPLY / DIVISION', value: result?.supply, key: 'supply' }];
  const equipmentSelect = (value: string, onChange: (value: string) => void, label: string) => <select aria-label={label} value={value} disabled={!referenceReady || !equipment.length} onChange={event => onChange(event.target.value)}>{!equipment.length && <option value={value}>Equipment unavailable</option>}{equipment.map(entry => <option key={entry.uid} value={entry.id}>{entry.title} ({declaredYear({year:entry.data.resolvedStats?.year??entry.data.year})??'Unknown year'})</option>)}</select>;
  const eqA = referenceReady?equipment.find(entry => entry.id === a):undefined, eqB = referenceReady?equipment.find(entry => entry.id === b):undefined;

  return <>
    <PageTitle eyebrow="TEMPLATES & EQUIPMENT" title="Division & production" text="Plan army requirements and estimate military production." />
    <div className="notice small"><Shield size={18} /><span>Base values only. Technologies, doctrines, designers, equipment variants, terrain, and national modifiers are excluded.</span></div>
    {loadState === 'loading' && <p role="status" className="muted">Loading installed units and equipment…</p>}
    {loadState === 'error' && <div className="notice small" role="alert"><span>{loadError || 'Unit and equipment data could not be loaded.'}</span><button className="button" onClick={() => setReload(value => value + 1)}><RefreshCw size={14} />Retry loading</button></div>}
    {loadState === 'ready' && (!units.length || !equipment.length) && <div className="notice small">Some unit or equipment definitions are missing. Refresh game data in Sources & settings.</div>}
    <div className="lab-layout">
      <section className="panel">
        <div className="section-label">DIVISION TEMPLATE <Shield size={18} /></div>
        <label>Template name<input value={name} maxLength={100} onChange={event => setName(event.target.value)} /></label>
        <div className="template-rows">{rows.map((row, i) => <div className="template-row" key={i}>
          <select aria-label={`Unit ${i + 1}`} value={row.id} disabled={!referenceReady || !units.length} onChange={event => updateRow(i, { id: event.target.value })}>{units.map(unit => <option value={unit.id} key={unit.uid}>{unit.title}{unit.data.support ? ' · support' : ''}</option>)}</select>
          <input aria-label={`Count ${i + 1}`} type="number" min={0} max={units.find(unit => unit.id === row.id)?.data.support ? 1 : 25} value={row.count} onChange={event => updateRow(i, { count: event.target.value === '' ? '' : Number(event.target.value) })} />
          <button className="icon-button" title="Remove unit" onClick={() => setRows(previous => previous.filter((_, index) => i !== index))}><Trash2 size={15} /></button>
        </div>)}</div>
        <div className="button-row">
          <button className="button" disabled={!referenceReady || !units.some(unit => !rows.some(row => row.id === unit.id))} onClick={() => { const next = units.find(unit => !rows.some(row => row.id === unit.id)); if (next) setRows(previous => [...previous, { id: next.id, count: 1 }]); }}><Plus size={15} />Add unit type</button>
          <button className="button primary" disabled={!profile || !result || !name.trim() || templateBusy} onClick={async () => {
            if (!profile || !result) return;
            setTemplateBusy(true);
            try { const list = [...saved.filter(template => template.name !== name.trim()), { name: name.trim(), rows: rows.map(row => ({ id: row.id, count: Number(row.count) })) }]; await save({ ...profile, templates: list }); notify('Template saved to this campaign.'); }
            catch {} finally { setTemplateBusy(false); }
          }}><Save size={15} />{templateBusy ? 'Saving…' : 'Save template'}</button>
        </div>
        {!profile && <small className="muted">Create a campaign to save templates.</small>}
        <label>Divisions to field<input aria-label="Army division count" type="number" min={1} max={10000} value={divisions} onChange={event => setDivisions(event.target.value)} /></label>
        {calculationError && <p className="danger" role="alert">{calculationError}</p>}
        {!calculationError && !result && <p className="muted" role="status">Calculating requirements…</p>}
        {saved.length > 0 && <><h3>Saved templates</h3>{saved.map(template => <div className="saved-template" key={template.name}><strong>{template.name}</strong><button className="text-link" onClick={() => { setRows(template.rows); setName(template.name); }}>Load</button><button className="text-link" disabled={!!templateInputError} onClick={async () => { try { setCompare({value:await api('calculate', { rows: template.rows, divisions: divisionCount }),indexRevision}); setCompareName(template.name); } catch (error) { fail(error); } }}>Compare</button><button title="Delete saved template" className="icon-button" disabled={templateBusy} onClick={async () => { if (!profile) return; setTemplateBusy(true); try { await save({ ...profile, templates: saved.filter(value => value.name !== template.name) }); } catch {} finally { setTemplateBusy(false); } }}><Trash2 size={13} /></button></div>)}</>}
      </section>
      <div>
        <div className="lab-stats">{statCards.map(stat => <div className="stat" key={stat.key}><span>{stat.label}</span><strong>{stat.value == null ? '—' : number(stat.value)}</strong>{comparison && <small>vs {number(comparison[stat.key])} · {compareName}</small>}</div>)}</div>
        <section className="panel"><div className="section-label">ARMY REQUIREMENTS <span className="tag">{templateInputError ? '—' : number(divisionCount)} DIVISIONS</span></div><h2>{result ? number(result.armyManpower) : '—'} personnel</h2><p className="muted">At full strength; existing deployments and stockpiles are excluded.</p><div className="data-table">{Object.entries(result?.needs || {}).map(([id, count]) => <div key={id}><span>{equipment.find(entry => entry.id === id)?.title || id.replaceAll('_', ' ')}</span><strong>{number(Number(count))}</strong><button className="text-link" onClick={() => { const candidate = equipment.find(entry => entry.id === `${id}_1`) || equipment.find(entry => entry.data.archetype === id) || equipment.find(entry => entry.id === id); if (candidate) setLine(previous => ({ ...previous, equipment: candidate.id, quantity: String(count) })); }}>Plan production<ArrowRight size={13} /></button></div>)}</div><details><summary>Template assumptions</summary><p>Organization is the arithmetic mean of included units' base organization. Width, manpower, supply, and equipment needs are sums. Battalion layout restrictions and special-forces limits are not simulated.</p></details></section>
      </div>
    </div>
    <section className="panel production-panel">
      <div className="section-label">PRODUCTION ESTIMATOR <Factory size={18} /></div><h2>Military production</h2><p>One equipment line at constant efficiency.</p>
      <div className="production-form"><label>Equipment{equipmentSelect(line.equipment, value => setLine(previous => ({ ...previous, equipment: value })), 'Production equipment')}</label>{productionFields.map(field => <label key={field.key}>{field.label}<input type="number" min={0} max={'max' in field ? field.max : undefined} step={field.step} value={line[field.key]} onChange={event => { const value = event.target.value; setLine(previous => ({ ...previous, [field.key]: value })); }} /></label>)}</div>
      <div className="production-status" aria-live="polite">
        {productionBlock && <div className="notice small" role="status">{productionBlock}</div>}
        {productionError && <p className="danger" role="alert">{productionError}</p>}
        {productionPending && <p className="muted" role="status">Calculating production…</p>}
        {production && <><div className="production-result"><div><span>SHORTAGE</span><strong>{number(production.shortage)}</strong></div><div><span>UNITS / DAY</span><strong>{number(production.unitsPerDay)}</strong></div><div><span>ESTIMATED TIME</span><strong>{production.days == null ? 'No output' : `${number(production.days)} days`}</strong></div></div>{production.shortage > 0 && !production.unitsPerDay && <p className="muted">No completion estimate: the current factory allocation or output factors produce no equipment.</p>}</>}
      </div>
      {support?.supported !== false && <details><summary>Formula & assumptions</summary><p>Daily IC = {baseFactory ?? '?'} base IC × factories × efficiency × output factor × resource/disruption factor. Days = ceiling(shortage × equipment IC cost ÷ daily IC). Equipment IC cost: {!Number.isFinite(cost) || cost <= 0 ? 'unresolved' : number(cost)}.</p><p>Output is a multiplier: 1.2 means +20%. Efficiency growth, production switching, changing factory counts, licensing, MIOs, and equipment variants are excluded. Naval production requires a separate dockyard model and is unsupported in this release.</p></details>}
    </section>
    <section className="panel"><div className="section-label">EQUIPMENT COMPARISON</div><h2>Base equipment stats</h2><div className="comparison-selects">{equipmentSelect(a, setA, 'First comparison equipment')}{equipmentSelect(b, setB, 'Second comparison equipment')}</div><table className="comparison-table"><thead><tr><th>Base statistic</th><th><button disabled={!eqA} onClick={() => eqA && openEntry(eqA.uid)}>{eqA?.title || 'Unavailable'}<ArrowUpRight size={13} /></button></th><th><button disabled={!eqB} onClick={() => eqB && openEntry(eqB.uid)}>{eqB?.title || 'Unavailable'}<ArrowUpRight size={13} /></button></th></tr></thead><tbody>{['build_cost_ic', 'soft_attack', 'hard_attack', 'defense', 'breakthrough', 'armor_value', 'ap_attack', 'maximum_speed', 'reliability', 'hardness', 'air_attack', 'air_range', 'air_agility', 'naval_range', 'fuel_consumption'].filter(key => eqA?.data.resolvedStats?.[key] != null || eqB?.data.resolvedStats?.[key] != null).map(key => <tr key={key}><td>{key.replaceAll('_', ' ')}</td><td>{eqA?.data.resolvedStats?.[key] == null ? '—' : number(eqA.data.resolvedStats[key])}</td><td>{eqB?.data.resolvedStats?.[key] == null ? '—' : number(eqB.data.resolvedStats[key])}</td></tr>)}</tbody></table><details><summary>Comparison assumptions</summary><p>Equipment archetype defaults are inherited. Research parent links are not statistical inheritance. Modules, upgrades, technologies, and campaign modifiers are excluded.</p></details></section>
  </>;
}
