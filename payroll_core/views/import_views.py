from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from ..services.import_service import ImportService
import json

class ImportFieldsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, model_key):
        service = ImportService()
        try:
            fields = service.get_model_fields(model_key)
            return Response(fields)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ImportPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        service = ImportService()
        file_obj = request.FILES.get('file')
        
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            preview = service.preview_file(file_obj)
            return Response(preview)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ImportValidateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, model_key):
        service = ImportService()
        file_obj = request.FILES.get('file')
        mapping_str = request.data.get('mapping')
        
        if not file_obj or not mapping_str:
            return Response({'error': 'File and mapping are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mapping = json.loads(mapping_str)
            result = service.validate_import(file_obj, mapping, model_key)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ImportExecuteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, model_key):
        service = ImportService()
        file_obj = request.FILES.get('file')
        mapping_str = request.data.get('mapping')
        
        if not file_obj or not mapping_str:
            return Response({'error': 'File and mapping are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mapping = json.loads(mapping_str)
            result = service.execute_import(file_obj, mapping, model_key)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)





from django.views import View

class ImportTemplateView(View):
    def get(self, request, model_key):
        """
        GET /api/templates/{model_key}/?format=xlsx
        Downloads a template file for the given model.
        """
        service = ImportService()
        file_format = request.GET.get('format', 'xlsx')

        try:
            content, filename, content_type = service.generate_template(model_key, file_format)
            response = HttpResponse(content, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except ValueError as e:
            return HttpResponse(str(e), status=400)
        except Exception as e:
            return HttpResponse(str(e), status=500)
