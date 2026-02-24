"""
Generador de XML de Retenciones ISLR para SENIAT.

Genera el archivo XML requerido por el portal del SENIAT para la
declaración mensual de retenciones de Impuesto Sobre la Renta a
empleados bajo relación de dependencia.
"""
from decimal import Decimal
from datetime import date
from typing import Optional
import xml.etree.ElementTree as ET

from payroll_core.models import Company
from payroll_core.models.government_filings import ISLRRetention


class ISLRXMLExport:
    """
    Genera XML de retenciones ISLR para declaración ante SENIAT.
    """
    
    @staticmethod
    def generate(year: int, month: int) -> str:
        """
        Genera el contenido XML para retenciones ISLR del mes.
        
        Args:
            year: Año fiscal
            month: Mes
        
        Returns:
            String XML
        """
        retentions = ISLRRetention.objects.filter(
            year=year,
            month=month,
            retention_amount_ves__gt=0,
        ).select_related('employee')
        
        # Datos del agente de retención (empresa)
        try:
            company = Company.objects.first()
            agent_rif = company.rif if company else ''
            agent_name = company.name if company else ''
        except Exception:
            agent_rif = ''
            agent_name = ''
        
        # Construir XML
        root = ET.Element('RelacionRetencionesISLR')
        root.set('RifAgenteRetencion', agent_rif)
        root.set('Periodo', f"{year}{str(month).zfill(2)}")
        
        for ret in retentions:
            employee = ret.employee
            
            detalle = ET.SubElement(root, 'DetalleRetencion')
            
            # Datos del sujeto retenido
            ET.SubElement(detalle, 'RifRetenido').text = employee.rif or ''
            ET.SubElement(detalle, 'NumeroDocumento').text = employee.national_id or ''
            ET.SubElement(detalle, 'NombreRetenido').text = employee.full_name
            
            # Datos de la retención
            ET.SubElement(detalle, 'ConceptoPago').text = 'SUELDOS Y SALARIOS'
            ET.SubElement(detalle, 'CodigoConcepto').text = '001'
            ET.SubElement(detalle, 'MontoOperacion').text = f"{ret.taxable_income_ves:.2f}"
            ET.SubElement(detalle, 'PorcentajeRetencion').text = f"{ret.rate_applied:.2f}"
            ET.SubElement(detalle, 'MontoRetenido').text = f"{ret.retention_amount_ves:.2f}"
        
        # Generar string XML con declaración
        tree = ET.ElementTree(root)
        
        import io
        buffer = io.BytesIO()
        tree.write(buffer, encoding='utf-8', xml_declaration=True)
        xml_string = buffer.getvalue().decode('utf-8')
        
        return xml_string
    
    @staticmethod
    def get_filename(year: int, month: int) -> str:
        """Nombre del archivo XML."""
        try:
            company = Company.objects.first()
            rif = (company.rif or '').replace('-', '')
        except Exception:
            rif = 'SINRIF'
        
        return f"ISLR_{rif}_{year}{str(month).zfill(2)}.xml"
