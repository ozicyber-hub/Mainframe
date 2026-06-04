from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from findings.models import Finding
from .services import emit_finding_event


@receiver(pre_save, sender=Finding)
def capture_previous_finding_state(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return
    try:
        previous = Finding.objects.only('status').get(pk=instance.pk)
        instance._previous_status = previous.status
    except Finding.DoesNotExist:
        instance._previous_status = None


@receiver(post_save, sender=Finding)
def send_finding_integration_events(sender, instance, created, **kwargs):
    previous_status = getattr(instance, '_previous_status', None)
    if created:
        emit_finding_event('finding.created', instance)
        return

    emit_finding_event('finding.updated', instance, extra={'previous_status': previous_status})
    if previous_status and previous_status != instance.status:
        emit_finding_event(
            'finding.status_changed',
            instance,
            extra={'previous_status': previous_status, 'new_status': instance.status},
        )
        if instance.status == 'PUBLISHED':
            emit_finding_event('finding.published', instance)
