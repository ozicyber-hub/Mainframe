from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Tenant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('slug', models.SlugField(help_text='Subdomain slug, e.g. hacktive for hacktive.mainframe.ozicyber.com.au', max_length=80, unique=True)),
                ('primary_domain', models.CharField(blank=True, max_length=255)),
                ('plan', models.CharField(choices=[('INDIVIDUAL', 'Individual'), ('PRO', 'Pro'), ('ENTERPRISE', 'Enterprise')], default='PRO', max_length=20)),
                ('status', models.CharField(choices=[('TRIAL', 'Trial'), ('ACTIVE', 'Active'), ('PAUSED', 'Paused'), ('CANCELLED', 'Cancelled')], default='TRIAL', max_length=20)),
                ('primary_contact_name', models.CharField(blank=True, max_length=255)),
                ('primary_contact_email', models.EmailField(blank=True, max_length=254)),
                ('notes', models.TextField(blank=True)),
                ('subscription_started_at', models.DateField(blank=True, null=True)),
                ('subscription_renews_at', models.DateField(blank=True, null=True)),
                ('max_users', models.PositiveIntegerField(default=10)),
                ('max_organizations', models.PositiveIntegerField(default=25)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_tenants', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
    ]
