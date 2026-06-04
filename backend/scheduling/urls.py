from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CalendarEventViewSet, TeamTaskViewSet, TimeSlotRequestViewSet

router = DefaultRouter()
router.register('events',   CalendarEventViewSet,   basename='calendar-event')
router.register('tasks',    TeamTaskViewSet,         basename='team-task')
router.register('requests', TimeSlotRequestViewSet,  basename='timeslot-request')

urlpatterns = [path('', include(router.urls))]
