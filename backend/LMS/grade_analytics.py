"""
Grade Forecasting Service
Analyzes quiz performance and generates AI-powered grade predictions
"""

from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import QuizAttempt, QuizAnswer, QuizTopicPerformance, GradeForecast, Student, Subject, Quiz, SubjectOffering
from .ai_service import AIService


class GradeAnalyticsService:
    """Service for aggregating quiz data and generating forecasts"""
    
    def __init__(self):
        self.ai_service = AIService()
    
    def get_student_quiz_data(self, student_id, SubjectOffering_id=None):
        """
        Aggregate all quiz performance data for a student
        
        Args:
            student_id: Student ID
            SubjectOffering_id: Optional subject filter
        
        Returns:
            Dict with aggregated performance metrics
        """
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return None
        
        # Filter attempts by subject if specified
        attempts_query = QuizAttempt.objects.filter(
            student=student,
            status='GRADED'
        )
        
        if SubjectOffering_id:
            attempts_query = attempts_query.filter(quiz__SubjectOffering_id=SubjectOffering_id)
        
        attempts = attempts_query.select_related('quiz__SubjectOffering').order_by('submitted_at')
        
        if not attempts.exists():
            return None
        
        # Calculate basic metrics
        quiz_scores = [
            (att.score / att.quiz.total_points * 100) if att.quiz.total_points > 0 else 0
            for att in attempts
        ]
        
        current_average = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0
        
        # Analyze recent trend (last 3 quizzes vs previous)
        recent_trend = self._analyze_trend(quiz_scores)
        
        # Get topic-level performance
        topic_performance = self._calculate_topic_performance(student, SubjectOffering_id)
        
        # Get student name
        student_name = f"{student.user.first_name} {student.user.last_name}".strip() or student.user.email
        
        return {
            'student': student,
            'student_name': student_name,
            'quiz_scores': quiz_scores,
            'current_average': current_average,
            'quiz_count': len(quiz_scores),
            'recent_trend': recent_trend,
            'topic_performance': topic_performance,
            'last_quiz_date': attempts.last().submitted_at if attempts.exists() else None
        }
    
    def _analyze_trend(self, scores):
        """Analyze if scores are improving, stable, or declining"""
        if len(scores) < 2:
            return "Insufficient data (need at least 2 quizzes)"
        
        if len(scores) >= 3:
            recent_avg = sum(scores[-3:]) / 3
            earlier_avg = sum(scores[:-3]) / len(scores[:-3]) if len(scores) > 3 else scores[0]
        else:
            recent_avg = scores[-1]
            earlier_avg = scores[0]
        
        diff = recent_avg - earlier_avg
        
        if diff > 5:
            return f"Improving (recent avg {recent_avg:.1f}% vs earlier {earlier_avg:.1f}%)"
        elif diff < -5:
            return f"Declining (recent avg {recent_avg:.1f}% vs earlier {earlier_avg:.1f}%)"
        else:
            return f"Stable (avg around {recent_avg:.1f}%)"
    
    def _calculate_topic_performance(self, student, SubjectOffering_id=None):
        """
        Calculate per-topic accuracy from quiz questions
        
        Returns:
            List of dicts with topic, accuracy, correct, total
        """
        # Get all graded answers for the student
        answers_query = QuizAnswer.objects.filter(
            attempt__student=student,
            attempt__status='GRADED',
            question__question_type__in=['MULTIPLE_CHOICE', 'TRUE_FALSE']  # Only auto-graded
        ).select_related('question__quiz')
        
        if SubjectOffering_id:
            answers_query = answers_query.filter(attempt__quiz__SubjectOffering_id=SubjectOffering_id)
        
        # Group by quiz title as "topic" (you can enhance this with actual topic field)
        topic_stats = {}
        
        for answer in answers_query:
            topic = answer.question.quiz.title  # Using quiz title as topic
            
            if topic not in topic_stats:
                topic_stats[topic] = {'correct': 0, 'total': 0}
            
            topic_stats[topic]['total'] += 1
            if answer.is_correct:
                topic_stats[topic]['correct'] += 1
        
        # Convert to list format with accuracy
        performance_list = []
        for topic, stats in topic_stats.items():
            accuracy = (stats['correct'] / stats['total'] * 100) if stats['total'] > 0 else 0
            performance_list.append({
                'topic': topic,
                'accuracy': accuracy,
                'correct': stats['correct'],
                'total': stats['total']
            })
        
        # Sort by accuracy (descending)
        performance_list.sort(key=lambda x: x['accuracy'], reverse=True)
        
        return performance_list
    
    def update_topic_performance_records(self, student_id, SubjectOffering_id):
        """Update QuizTopicPerformance records in database"""
        try:
            student = Student.objects.get(id=student_id)
            offering = SubjectOffering.objects.get(id=SubjectOffering_id)
        except (Student.DoesNotExist, SubjectOffering.DoesNotExist):
            return False
        
        topic_data = self._calculate_topic_performance(student, SubjectOffering_id)
        
        # Update or create records
        for topic_info in topic_data:
            obj, created = QuizTopicPerformance.objects.update_or_create(
                student=student,
                SubjectOffering=offering,
                topic=topic_info['topic'],
                defaults={
                    'total_questions': topic_info['total'],
                    'correct_answers': topic_info['correct'],
                    'accuracy_percentage': topic_info['accuracy']
                }
            )
        
        return True
    
    def generate_forecast(self, student_id, SubjectOffering_id):
        """
        Generate or update grade forecast using AI
        
        Args:
            student_id: Student ID
            SubjectOffering_id: Subject ID
        
        Returns:
            GradeForecast object or None
        """
        # Get student data
        student_data = self.get_student_quiz_data(student_id, SubjectOffering_id)
        
        if not student_data or student_data['quiz_count'] < 1:
            return None  # Need at least 1 quiz for prediction
        
        try:
            subject = SubjectOffering.objects.get(id=SubjectOffering_id)
        except SubjectOffering.DoesNotExist:
            return None
        
        # Add subject name for AI context
        student_data['subject_name'] = subject.name
        
        # Call AI service for prediction
        ai_prediction = self.ai_service.predict_grade(student_data)
        
        # Update topic performance records
        self.update_topic_performance_records(student_id, SubjectOffering_id)
        
        # Create or update forecast record
        forecast, created = GradeForecast.objects.update_or_create(
            student=student_data['student'],
            SubjectOffering=SubjectOffering.objects.get(id=SubjectOffering_id),
            defaults={
                'current_average': student_data['current_average'],
                'quiz_count': student_data['quiz_count'],
                'predicted_grade': ai_prediction['predicted_grade'],
                'confidence_score': ai_prediction['confidence'],
                'risk_level': ai_prediction['risk_level'],
                'performance_trend': ai_prediction['trend'],
                'strong_topics': ai_prediction['strong_topics'],
                'weak_topics': ai_prediction['weak_topics'],
                'recommendations': ai_prediction['recommendations']
            }
        )
        
        return forecast
    
    def get_all_student_forecasts(self, student_id):
        """Get all subject forecasts for a student"""
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return []
        
        return GradeForecast.objects.filter(student=student).select_related('Subject')
