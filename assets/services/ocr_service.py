"""
Servicio OCR para extracción de datos de activos desde fotos.

Utiliza pytesseract (Tesseract OCR) para extraer texto de etiquetas,
placas de serial, y otros identificadores de activos.

Si tesseract no está disponible, retorna resultados vacíos graciosamente.
"""
import re
import logging
from io import BytesIO

logger = logging.getLogger(__name__)

try:
    from PIL import Image, ImageFilter, ImageEnhance
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False


class OCRService:
    """
    Servicio de OCR para extraer información de fotos de activos.
    
    Extrae:
    - Número de serial
    - Marca
    - Modelo
    - Texto completo
    """

    # Patrones comunes de números de serie
    SERIAL_PATTERNS = [
        r'S/?N[\s:]*([A-Z0-9\-]{5,30})',           # S/N: XXXXX
        r'Serial[\s#:]*([A-Z0-9\-]{5,30})',         # Serial: XXXXX
        r'(?:No\.?\s*(?:de\s*)?Serie)[\s:]*([A-Z0-9\-]{5,30})',  # No. Serie: XXXXX
        r'D\-SN[\s:]*([A-Z0-9\-]{5,30})',           # D-SN: XXXXX (GPON routers)
        r'MAC[\s:]*([A-Z0-9\-:]{10,25})',           # MAC Addresses often used as unique IDs
        r'\b([A-Z]{2,4}[\-][A-Z0-9]{4,}[\-]?[A-Z0-9]*)\b',     # XX-XXXXX formato serial
    ]

    # Marcas conocidas (expandibles)
    KNOWN_BRANDS = [
        'HP', 'DELL', 'LENOVO', 'ACER', 'ASUS', 'SAMSUNG', 'LG', 'SONY',
        'EPSON', 'BROTHER', 'CANON', 'XEROX', 'RICOH', 'TOSHIBA',
        'APPLE', 'MICROSOFT', 'LOGITECH', 'BENQ', 'AOC', 'VIEWSONIC',
        'CISCO', 'NETGEAR', 'TP-LINK', 'UBIQUITI', 'MIKROTIK',
        'DAHUA', 'HIKVISION', 'HONEYWELL', 'BOSCH', 'ZTE', 'HUAWEI'
    ]

    # Patrones de modelo
    MODEL_PATTERNS = [
        r'Model[\s:]*([A-Z0-9\-\.]{3,30})',
        r'Modelo[\s:]*([A-Z0-9\-\.]{3,30})',
        r'Product[\s:]*([A-Z0-9\-\.\s]{3,30})',     # Product: GPON ONT
        r'P/?N[\s:]*([A-Z0-9\-\.]{5,30})',          # Part Number
        r'(?:Ref|REF)[\s.:]*([A-Z0-9\-\.]{3,30})',
    ]

    @classmethod
    def extract_from_image(cls, image_file, confidence_threshold=0.85):
        """
        Extrae datos de una imagen.
        
        Args:
            image_file: Django UploadedFile o ruta al archivo
            confidence_threshold: Umbral de confianza (0-1)
        
        Returns:
            dict: {
                'raw_text': str,
                'serial_number': str|None,
                'brand': str|None,
                'model': str|None,
                'confidence': float,
                'available': bool,
            }
        """
        result = {
            'raw_text': '',
            'serial_number': None,
            'brand': None,
            'model': None,
            'confidence': 0.0,
            'available': False,
        }

        if not HAS_PIL or not HAS_TESSERACT:
            logger.warning('OCR no disponible: PIL=%s, Tesseract=%s', HAS_PIL, HAS_TESSERACT)
            result['error'] = 'OCR no configurado en el servidor'
            return result

        try:
            # Abrir y preprocesar imagen
            if hasattr(image_file, 'read'):
                img = Image.open(image_file)
                image_file.seek(0)  # Reset para uso posterior
            else:
                img = Image.open(image_file)

            img = cls._preprocess_image(img)

            # Extraer texto con tesseract
            custom_oem_psm_config = r'--oem 3 --psm 6'
            ocr_data = pytesseract.image_to_data(
                img, lang='eng+spa', output_type=pytesseract.Output.DICT, config=custom_oem_psm_config
            )

            # Obtener texto con confianza
            texts_with_conf = []
            for i, text in enumerate(ocr_data['text']):
                conf = int(ocr_data['conf'][i])
                if conf > 0 and text.strip():
                    texts_with_conf.append((text.strip(), conf / 100.0))

            raw_text = ' '.join(t[0] for t in texts_with_conf)
            avg_confidence = (
                sum(t[1] for t in texts_with_conf) / len(texts_with_conf)
                if texts_with_conf else 0.0
            )

            result['raw_text'] = raw_text
            result['confidence'] = round(avg_confidence, 2)
            result['available'] = True

            # Extraer serial
            serial = cls._extract_serial(raw_text)
            if serial:
                result['serial_number'] = serial

            # Extraer marca
            brand = cls._extract_brand(raw_text)
            if brand:
                result['brand'] = brand

            # Extraer modelo
            model = cls._extract_model(raw_text)
            if model:
                result['model'] = model

            # Ajustar confianza basada en campos encontrados
            fields_found = sum(1 for v in [serial, brand, model] if v)
            if fields_found > 0:
                result['confidence'] = min(1.0, avg_confidence + (fields_found * 0.05))

        except Exception as e:
            logger.error('Error procesando OCR: %s', str(e))
            result['error'] = str(e)

        return result

    @classmethod
    def _preprocess_image(cls, img):
        """Preprocesa la imagen para mejorar la lectura OCR."""
        # Convertir a RGB y luego a escala de grises
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img = img.convert('L')

        # Redimensionar (agrandar si es muy pequeña, achicar si es enorme)
        # Tesseract funciona mejor con imágenes de ~300 DPI (aprox 1500-2500px ancho)
        max_dim = 2500
        min_dim = 1000
        current_max = max(img.size)

        if current_max > max_dim:
            ratio = max_dim / current_max
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        elif current_max < min_dim:
            ratio = min_dim / current_max
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        # Aplicar filtro de umbral adaptativo o aumentar fuerte el contraste
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.5)

        # Aumentar nitidez
        img = img.filter(ImageFilter.SHARPEN)

        # Binarización simple (threshold) para limpiar el fondo grisáceo común en etiquetas
        img = img.point(lambda x: 0 if x < 150 else 255)

        return img

    @classmethod
    def _extract_serial(cls, text):
        """Extrae número de serial del texto."""
        text_upper = text.upper()
        for pattern in cls.SERIAL_PATTERNS:
            match = re.search(pattern, text_upper)
            if match:
                return match.group(1).strip()
        return None

    @classmethod
    def _extract_brand(cls, text):
        """Detecta marcas conocidas en el texto."""
        text_upper = text.upper()
        for brand in cls.KNOWN_BRANDS:
            if brand.upper() in text_upper:
                return brand
        return None

    @classmethod
    def _extract_model(cls, text):
        """Extrae número de modelo del texto."""
        text_upper = text.upper()
        for pattern in cls.MODEL_PATTERNS:
            match = re.search(pattern, text_upper)
            if match:
                return match.group(1).strip()
        return None
