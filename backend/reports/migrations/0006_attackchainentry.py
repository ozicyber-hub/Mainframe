from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0005_reporttemplate_docx_file_is_default'),
        ('findings', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AttackChainEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phase', models.CharField(choices=[
                    ('RECONNAISSANCE', 'Reconnaissance'),
                    ('INITIAL_ACCESS', 'Initial Access'),
                    ('EXECUTION', 'Execution'),
                    ('PERSISTENCE', 'Persistence'),
                    ('PRIVILEGE_ESCALATION', 'Privilege Escalation'),
                    ('DEFENSE_EVASION', 'Defense Evasion'),
                    ('CREDENTIAL_ACCESS', 'Credential Access'),
                    ('LATERAL_MOVEMENT', 'Lateral Movement'),
                    ('COLLECTION', 'Collection'),
                    ('EXFILTRATION', 'Exfiltration'),
                    ('IMPACT', 'Impact'),
                ], max_length=30)),
                ('position', models.PositiveIntegerField(default=0)),
                ('notes', models.TextField(blank=True)),
                ('finding', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attack_chain_entries', to='findings.finding')),
                ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attack_chain', to='reports.report')),
            ],
            options={'ordering': ['phase', 'position'], 'unique_together': {('report', 'finding', 'phase')}},
        ),
    ]
