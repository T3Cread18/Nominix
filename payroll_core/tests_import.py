from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from payroll_core.models import Employee, Branch
from payroll_core.services.import_service import ImportService
import pandas as pd
import json
import io

class ImportServiceTest(TestCase):
    def setUp(self):
        self.service = ImportService()
        self.branch = Branch.objects.create(name="Sede Principal", code="MAIN")

    def test_get_model_fields(self):
        fields = self.service.get_model_fields('employee')
        field_names = [f['name'] for f in fields]
        self.assertIn('first_name', field_names)
        self.assertIn('last_name', field_names)
        self.assertIn('national_id', field_names)
        self.assertIn('branch', field_names)

    def test_preview_file_csv(self):
        csv_content = b'Nombre,Apellido,Cedula\nJuan,Perez,123456'
        file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")
        preview = self.service.preview_file(file)
        self.assertEqual(preview['headers'], ['Nombre', 'Apellido', 'Cedula'])
        self.assertEqual(len(preview['preview']), 1)
        self.assertEqual(preview['preview'][0]['Nombre'], 'Juan')

    def test_validate_import(self):
        csv_content = b'Nombre,Apellido,Cedula,Sede\nJuan,Perez,123456,Sede Principal'
        file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")
        mapping = {
            'Nombre': 'first_name',
            'Apellido': 'last_name',
            'Cedula': 'national_id',
            'Sede': 'branch'
        }
        
        result = self.service.validate_import(file, mapping, 'employee')
        self.assertTrue(result['valid'])
        self.assertEqual(len(result['errors']), 0)

    def test_validate_import_error(self):
        # Missing required field (national_id is usually required)
        csv_content = b'Nombre,Apellido,Cedula\nJuan,Perez,'
        file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")
        mapping = {
            'Nombre': 'first_name',
            'Apellido': 'last_name',
            'Cedula': 'national_id'
        }
        
        result = self.service.validate_import(file, mapping, 'employee')
        self.assertFalse(result['valid'])
        self.assertTrue(len(result['errors']) > 0)

    def test_execute_import(self):
        csv_content = b'Nombre,Apellido,Cedula,Email\nCarlos,Gomez,987654,carlos@test.com'
        file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")
        mapping = {
            'Nombre': 'first_name',
            'Apellido': 'last_name',
            'Cedula': 'national_id',
            'Email': 'email'
        }
        
        result = self.service.execute_import(file, mapping, 'employee')
        self.assertEqual(result['created'], 1)
        
        emp = Employee.objects.get(national_id='987654')
        self.assertEqual(emp.first_name, 'Carlos')
        self.assertEqual(emp.last_name, 'Gomez')

    def test_import_update(self):
         # Create existing employee
        Employee.objects.create(national_id='111222', first_name='OldName', last_name='OldLast')

        csv_content = b'Nombre,Apellido,Cedula\nNewName,NewLast,111222'
        file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")
        mapping = {
            'Nombre': 'first_name',
            'Apellido': 'last_name',
            'Cedula': 'national_id'
        }

        result = self.service.execute_import(file, mapping, 'employee')
        self.assertEqual(result['updated'], 1)
        
        emp = Employee.objects.get(national_id='111222')
        self.assertEqual(emp.first_name, 'NewName')
