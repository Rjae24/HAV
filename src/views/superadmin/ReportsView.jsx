import { useState } from 'react';
import FinanzasReport from './FinanzasReport';
import CensoPacientesReport from './CensoPacientesReport';
import RendimientoEspecialistasReport from './RendimientoEspecialistasReport';
import EpidemiologiaReport from './EpidemiologiaReport';

export default function ReportsView({ showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('finanzas'); // 'finanzas', 'censo', 'especialistas' o 'epidemiologia'

  return (
    <div className="p-6 space-y-6 view-enter h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar flex flex-col">
      {/* Cabecera Consolidada */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 flex-shrink-0 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">
            Reportes Clínicos y Analíticos
          </h1>
          <p className="text-hav-text-muted text-xs mt-0.5">
            Módulo maestro de auditoría de conversión, rendimiento médico y censo general del hospital
          </p>

          {/* Toggle de sub-pestañas */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold mt-4 w-max">
            {[
              { id: 'finanzas', label: 'Reporte Financiero' },
              { id: 'censo', label: 'Censo de Pacientes' },
              { id: 'especialistas', label: 'Rendimiento Especialistas' },
              { id: 'epidemiologia', label: 'Perfil Epidemiológico' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeSubTab === tab.id 
                    ? 'bg-white text-hav-primary shadow-sm' 
                    : 'text-hav-text-muted hover:text-hav-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Renderizado de Reportes Aislados (Totalmente Modulares) */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeSubTab === 'finanzas' && (
          <FinanzasReport showToast={showToast} />
        )}
        {activeSubTab === 'censo' && (
          <CensoPacientesReport showToast={showToast} />
        )}
        {activeSubTab === 'especialistas' && (
          <RendimientoEspecialistasReport showToast={showToast} />
        )}
        {activeSubTab === 'epidemiologia' && (
          <EpidemiologiaReport showToast={showToast} />
        )}
      </div>
    </div>
  );
}
