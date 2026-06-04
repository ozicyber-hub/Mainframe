from django.urls import path
from .views import BreachSearchView, BreachPasteSearchView, BreachImportFindingView, BreachStatusView

urlpatterns = [
    path('search/',  BreachSearchView.as_view(),        name='breach_search'),
    path('pastes/',  BreachPasteSearchView.as_view(),   name='breach_pastes'),
    path('import/',  BreachImportFindingView.as_view(), name='breach_import'),
    path('status/',  BreachStatusView.as_view(),        name='breach_status'),
]
