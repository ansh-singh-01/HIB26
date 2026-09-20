"""add patient records, care encounters, and followup patient_id

Revision ID: d7890123456a
Revises: c679453a793b
Create Date: 2026-09-05 19:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7890123456a'
down_revision: Union[str, Sequence[str], None] = 'c679453a793b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. patient_medications
    op.create_table(
        'patient_medications',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('patient_id', sa.UUID(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('medicine_name', sa.String(length=255), nullable=False),
        sa.Column('dosage', sa.String(length=100), nullable=True),
        sa.Column('frequency', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('prescribed_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # 2. patient_allergies
    op.create_table(
        'patient_allergies',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('patient_id', sa.UUID(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('allergen', sa.String(length=255), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='moderate'),
        sa.Column('reaction', sa.Text(), nullable=True),
    )

    # 3. medical_test_records
    op.create_table(
        'medical_test_records',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('patient_id', sa.UUID(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('test_name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('result_summary', sa.Text(), nullable=True),
        sa.Column('test_date', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # 4. care_encounters
    op.create_table(
        'care_encounters',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('patient_id', sa.UUID(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('facility_id', sa.UUID(), sa.ForeignKey('facilities.id'), nullable=True),
        sa.Column('doctor_id', sa.UUID(), sa.ForeignKey('doctors.id'), nullable=True),
        sa.Column('chief_complaint', sa.Text(), nullable=True),
        sa.Column('diagnosis', sa.String(length=255), nullable=True),
        sa.Column('treatment_notes', sa.Text(), nullable=True),
        sa.Column('encounter_date', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # 5. Add patient_id to follow_ups
    op.add_column('follow_ups', sa.Column('patient_id', sa.UUID(), sa.ForeignKey('patients.id'), nullable=True))


def downgrade() -> None:
    op.drop_column('follow_ups', 'patient_id')
    op.drop_table('care_encounters')
    op.drop_table('medical_test_records')
    op.drop_table('patient_allergies')
    op.drop_table('patient_medications')
