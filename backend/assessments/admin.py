from django.contrib import admin
from .models import (
    AssessmentTemplate, AssessmentSection, AssessmentQuestion,
    Assessment, AssessmentResponse, AssessmentEvidence,
    SectionEvidenceRequirement, EvidenceSubmission,
)


class AssessmentQuestionInline(admin.TabularInline):
    model  = AssessmentQuestion
    extra  = 0
    fields = ['text', 'question_type', 'maturity_level', 'order', 'is_required', 'weight']


class EvidenceRequirementInline(admin.TabularInline):
    model  = SectionEvidenceRequirement
    extra  = 1
    fields = ['title', 'document_type', 'required', 'order', 'description']


class AssessmentSectionInline(admin.TabularInline):
    model  = AssessmentSection
    extra  = 0
    fields = ['name', 'description', 'order']
    show_change_link = True


@admin.register(AssessmentTemplate)
class AssessmentTemplateAdmin(admin.ModelAdmin):
    list_display  = ['name', 'framework', 'is_active', 'created_at']
    list_filter   = ['framework', 'is_active']
    search_fields = ['name']
    inlines       = [AssessmentSectionInline]


@admin.register(AssessmentSection)
class AssessmentSectionAdmin(admin.ModelAdmin):
    list_display  = ['name', 'template', 'order']
    list_filter   = ['template']
    search_fields = ['name']
    inlines       = [AssessmentQuestionInline, EvidenceRequirementInline]


@admin.register(SectionEvidenceRequirement)
class SectionEvidenceRequirementAdmin(admin.ModelAdmin):
    list_display  = ['title', 'section', 'document_type', 'required', 'order']
    list_filter   = ['document_type', 'required', 'section__template']
    search_fields = ['title', 'description']
    ordering      = ['section', 'order']


@admin.register(EvidenceSubmission)
class EvidenceSubmissionAdmin(admin.ModelAdmin):
    list_display  = ['requirement', 'assessment', 'status', 'submitted_at', 'reviewed_by']
    list_filter   = ['status']
    search_fields = ['assessment__title', 'requirement__title', 'filename']
    readonly_fields = ['submitted_at', 'ai_validated_at', 'reviewed_at', 'created_at', 'updated_at']


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display  = ['title', 'template', 'status', 'score', 'is_baseline', 'created_at']
    list_filter   = ['status', 'is_baseline', 'template']
    search_fields = ['title']
