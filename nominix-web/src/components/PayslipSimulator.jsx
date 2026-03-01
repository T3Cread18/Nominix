import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * PayslipSimulator - Componente central de Nóminix para simulación de nómina.
 * 
 * Permite a los usuarios ingresar novedades (horas extra) y visualizar 
 * un recibo digital calculado por el motor legal en tiempo real.
 */
const PayslipSimulator = ({ employeeId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    overtime_hours: 0,
    night_hours: 0,
  });
  const [payslip, setPayslip] = useState(null);

  // Formateadores de moneda
  const formatVES = (val) =>
    new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(val);

  const formatUSD = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Nota: En producción, usar una instancia de axios configurada con el baseURL del tenant
      const response = await axios.post(`/api/employees/${employeeId}/simulate-payslip/`, formData);
      console.log('PAYSLIP RESPONSE:', response.data);
      setPayslip(response.data);
    } catch (err) {
      setError('Error al conectar con el motor de nómina. Verifica el contrato del empleado.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    if (employeeId) fetchData();
  }, [employeeId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  return (
    <div className="min-h-screen bg-nominix-bg p-8 font-sans text-nominix-dark">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* PANEL DE CONTROL (Izquierda) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-nominix-dark">Variables del Periodo</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Horas Extra Diurnas (50%)</label>
                <input
                  type="number"
                  name="overtime_hours"
                  value={formData.overtime_hours}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-nominix-bg rounded-lg border-2 border-transparent focus:border-nominix-primary focus:outline-none text-xl font-semibold transition-all"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Bono Nocturno (30%)</label>
                <input
                  type="number"
                  name="night_hours"
                  value={formData.night_hours}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-nominix-bg rounded-lg border-2 border-transparent focus:border-nominix-primary focus:outline-none text-xl font-semibold transition-all"
                  placeholder="0"
                />
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full py-4 bg-nominix-primary text-white rounded-lg font-bold text-lg shadow-blue-500/30 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {loading ? 'Calculando...' : 'Recalcular Nómina'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-sm">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* RECIBO DIGITAL (Derecha) */}
        <div className="lg:col-span-8">
          {payslip ? (
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden relative border border-gray-100 transform rotate-1 transition-transform hover:rotate-0 duration-500">

              {/* Marca de Agua / Decoración */}
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <span className="text-8xl font-black">NÓMINIX</span>
              </div>

              {/* Header Recibo */}
              <div className="p-10 border-b border-gray-50">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-nominix-dark">NÓMINIX</h1>
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">Recibo de Pago Digital</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-nominix-bg px-4 py-2 rounded-lg text-nominix-primary font-bold text-sm">
                      Tasa BCV: {payslip.exchange_rate_used} VES/USD
                    </div>
                    <p className="text-gray-400 text-xs mt-2 uppercase">{payslip.payment_date}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Colaborador</p>
                    <p className="text-xl font-bold">{payslip.employee}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-bold">Cargo / Posición</p>
                    <p className="font-semibold">{payslip.position || 'No especificado'}</p>
                  </div>
                </div>
              </div>

              {/* Detalle de Conceptos */}
              <div className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="bg-nominix-bg text-gray-500 text-xs uppercase tracking-widest">
                      <th className="px-10 py-4 text-left font-bold">Concepto</th>
                      <th className="px-10 py-4 text-center font-bold">Tipo</th>
                      <th className="px-10 py-4 text-right font-bold">Monto (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payslip.lines.map((line, idx) => (
                      <tr key={`${line.name}-${line.kind}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-10 py-5 text-sm font-medium">{line.name}</td>
                        <td className="px-10 py-5 text-center">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${line.kind === 'EARNING' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {line.kind === 'EARNING' ? 'Asignación' : 'Deducción'}
                          </span>
                        </td>
                        <td className="px-10 py-5 text-right font-mono font-bold text-lg">
                          {line.kind === 'DEDUCTION' ? '-' : ''}{line.amount_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer de Totales */}
              <div className="bg-nominix-dark p-10 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Neto a Liquidar</p>
                    <div className="flex items-center gap-4">
                      <h3 className="text-4xl font-black">{formatVES(payslip.totals.net_pay_ves)}</h3>
                      <div className="bg-white/10 px-3 py-1 rounded-md text-xs font-bold border border-white/20">
                        Ref: {formatUSD(payslip.totals.net_pay_usd_ref)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right opacity-50">
                    <p className="text-[10px] uppercase font-bold tracking-widest">Validado por Nóminix Vzla v1.0</p>
                    <p className="text-[8px]">Basado en LOTTT & IVSS vigente</p>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 border-4 border-dashed border-gray-100 rounded-xl p-20">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-medium">Ingresa las variables para generar el recibo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayslipSimulator;
