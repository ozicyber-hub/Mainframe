from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('repository', '0002_repositoryfolder_findingtemplate_folder'),
    ]

    operations = [
        migrations.AddField(
            model_name='repositoryfolder',
            name='parent',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='children',
                to='repository.repositoryfolder',
            ),
        ),
    ]
