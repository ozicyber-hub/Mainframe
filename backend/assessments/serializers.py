from rest_framework import serializers
from .models import (
    AssessmentTemplate, AssessmentSection, AssessmentQuestion,
    Assessment, AssessmentResponse, AssessmentEvidence,
    SectionEvidenceRequirement, EvidenceSubmission,
)


class AssessmentQuestionSerializer(serializers.ModelSerializer):
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)

    class Meta:
        model  = AssessmentQuestion
        fields = [
            'id', 'text', 'guidance', 'question_type', 'question_type_display',
            'options', 'maturity_level', 'order', 'is_required', 'weight',
        ]


class SectionEvidenceRequirementSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model  = SectionEvidenceRequirement
        fields = [
            'id', 'section', 'title', 'description', 'document_type',
            'document_type_display', 'required', 'validation_prompt', 'order',
        ]


class EvidenceSubmissionSerializer(serializers.ModelSerializer):
    requirement_title                 = serializers.CharField(source='requirement.title',                       read_only=True)
    requirement_description           = serializers.CharField(source='requirement.description',                  read_only=True)
    requirement_document_type         = serializers.CharField(source='requirement.document_type',                read_only=True)
    requirement_document_type_display = serializers.CharField(source='requirement.get_document_type_display',    read_only=True)
    requirement_required              = serializers.BooleanField(source='requirement.required',                  read_only=True)
    requirement_section_id            = serializers.IntegerField(source='requirement.section_id',                read_only=True)
    requirement_validation_prompt     = serializers.CharField(source='requirement.validation_prompt',            read_only=True)
    status_display                    = serializers.CharField(source='get_status_display',                       read_only=True)
    submitted_by_name                 = serializers.CharField(source='submitted_by.get_full_name',               read_only=True)
    reviewed_by_name                  = serializers.CharField(source='reviewed_by.get_full_name',                read_only=True)
    file_url                          = serializers.SerializerMethodField()

    class Meta:
        model  = EvidenceSubmission
        fields = [
            'id', 'assessment', 'requirement',
            'requirement_title', 'requirement_description',
            'requirement_document_type', 'requirement_document_type_display',
            'requirement_required', 'requirement_section_id', 'requirement_validation_prompt',
            'file', 'file_url', 'filename',
            'submitted_by', 'submitted_by_name', 'submitted_at',
            'status', 'status_display',
            'ai_result', 'ai_validated_at',
            'reviewer_notes', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'submitted_by', 'submitted_at',
            'ai_result', 'ai_validated_at',
            'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class AssessmentSectionSerializer(serializers.ModelSerializer):
    questions             = AssessmentQuestionSerializer(many=True, read_only=True)
    evidence_requirements = SectionEvidenceRequirementSerializer(many=True, read_only=True)

    class Meta:
        model  = AssessmentSection
        fields = ['id', 'name', 'description', 'order', 'questions', 'evidence_requirements']


class AssessmentTemplateSerializer(serializers.ModelSerializer):
    framework_display = serializers.CharField(source='get_framework_display', read_only=True)
    sections          = AssessmentSectionSerializer(many=True, read_only=True)
    question_count    = serializers.SerializerMethodField()

    class Meta:
        model  = AssessmentTemplate
        fields = ['id', 'name', 'framework', 'framework_display', 'description', 'is_active', 'sections', 'question_count', 'created_at']

    def get_question_count(self, obj):
        return sum(s.questions.count() for s in obj.sections.all())


class AssessmentTemplateListSerializer(serializers.ModelSerializer):
    framework_display = serializers.CharField(source='get_framework_display', read_only=True)
    question_count    = serializers.SerializerMethodField()

    class Meta:
        model  = AssessmentTemplate
        fields = ['id', 'name', 'framework', 'framework_display', 'description', 'is_active', 'question_count']

    def get_question_count(self, obj):
        return AssessmentQuestion.objects.filter(section__template=obj).count()


class AssessmentEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model  = AssessmentEvidence
        fields = ['id', 'file', 'description', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']


class AssessmentResponseSerializer(serializers.ModelSerializer):
    evidence         = AssessmentEvidenceSerializer(many=True, read_only=True)
    question_text    = serializers.CharField(source='question.text', read_only=True)
    question_type    = serializers.CharField(source='question.question_type', read_only=True)

    class Meta:
        model  = AssessmentResponse
        fields = [
            'id', 'assessment', 'question', 'question_text', 'question_type',
            'answer', 'maturity_achieved', 'notes', 'updated_at', 'evidence',
        ]
        read_only_fields = ['id', 'updated_at']


class AssessmentSerializer(serializers.ModelSerializer):
    template_name         = serializers.CharField(source='template.name', read_only=True)
    framework             = serializers.CharField(source='template.framework', read_only=True)
    framework_display     = serializers.CharField(source='template.get_framework_display', read_only=True)
    engagement_name       = serializers.CharField(source='engagement.name', read_only=True)
    assessor_name         = serializers.CharField(source='assessor.get_full_name', read_only=True)
    created_by_name       = serializers.CharField(source='created_by.get_full_name', read_only=True)
    grc_consultant_name   = serializers.CharField(source='grc_consultant.get_full_name', read_only=True)
    organization_name     = serializers.CharField(source='organization.name', read_only=True)
    status_display        = serializers.CharField(source='get_status_display', read_only=True)
    responses             = AssessmentResponseSerializer(many=True, read_only=True)
    response_count        = serializers.SerializerMethodField()
    baseline_title        = serializers.CharField(source='baseline.title', read_only=True)
    baseline_score        = serializers.FloatField(source='baseline.score', read_only=True)
    followup_count        = serializers.SerializerMethodField()

    class Meta:
        model  = Assessment
        fields = [
            'id', 'title', 'status', 'status_display', 'notes', 'score',
            'is_baseline', 'baseline', 'baseline_title', 'baseline_score', 'followup_count',
            'template', 'template_name', 'framework', 'framework_display',
            'engagement', 'engagement_name',
            'organization', 'organization_name',
            'assessor', 'assessor_name',
            'grc_consultant', 'grc_consultant_name',
            'start_date', 'end_date',
            'created_by', 'created_by_name',
            'created_at', 'updated_at', 'completed_at',
            'responses', 'response_count',
            'control_config',
        ]
        read_only_fields = ['id', 'created_by', 'score', 'created_at', 'updated_at', 'completed_at']

    def get_response_count(self, obj):
        return obj.responses.count()

    def get_followup_count(self, obj):
        return obj.followups.count()


class AssessmentListSerializer(serializers.ModelSerializer):
    template_name         = serializers.CharField(source='template.name', read_only=True)
    framework             = serializers.CharField(source='template.framework', read_only=True)
    framework_display     = serializers.CharField(source='template.get_framework_display', read_only=True)
    engagement_name       = serializers.CharField(source='engagement.name', read_only=True)
    assessor_name         = serializers.CharField(source='assessor.get_full_name', read_only=True)
    grc_consultant_name   = serializers.CharField(source='grc_consultant.get_full_name', read_only=True)
    organization_name     = serializers.CharField(source='organization.name', read_only=True)
    status_display        = serializers.CharField(source='get_status_display', read_only=True)
    response_count        = serializers.SerializerMethodField()
    baseline_title        = serializers.CharField(source='baseline.title', read_only=True)

    class Meta:
        model  = Assessment
        fields = [
            'id', 'title', 'status', 'status_display', 'score',
            'is_baseline', 'baseline', 'baseline_title',
            'template', 'template_name', 'framework', 'framework_display',
            'engagement', 'engagement_name',
            'organization', 'organization_name',
            'assessor', 'assessor_name',
            'grc_consultant', 'grc_consultant_name',
            'start_date', 'end_date',
            'created_at', 'updated_at', 'response_count',
            'control_config',
        ]

    def get_response_count(self, obj):
        return obj.responses.count()
