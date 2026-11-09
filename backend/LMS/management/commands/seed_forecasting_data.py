from django.core.management.base import BaseCommand
from LMS.ml.seeder import seed_historical_forecasting_data
from LMS.ml.trainer import ForecastingTrainer


class Command(BaseCommand):
    help = 'Seeds historical academic performance data and trains all 4 regression models (Baseline, Linear Regression, Random Forest, Gradient Boosting).'

    def add_arguments(self, parser):
        parser.add_argument('--skip-seed', action='store_true', help='Skip data seeding and only run model training.')

    def handle(self, *args, **options):
        if not options.get('skip_seed'):
            self.stdout.write(self.style.NOTICE("1. Seeding historical semester academic data..."))
            seed_historical_forecasting_data(verbose=True)
            self.stdout.write(self.style.SUCCESS("[OK] Historical data successfully seeded!"))

        self.stdout.write(self.style.NOTICE("2. Training and evaluating regression models on Time-Aware Split (SEM1 -> Train, SEM2 -> Val, SEM3 -> Test)..."))
        trainer = ForecastingTrainer()
        results = trainer.train_and_evaluate()

        self.stdout.write(self.style.SUCCESS(f"\n[OK] Training Complete! Best Model: {results['best_model']}"))
        self.stdout.write(f"Sample breakdown: {results['train_count']} train, {results['val_count']} val, {results['test_count']} test (Total: {results['total_samples']})\n")

        self.stdout.write("================= OVERALL TEST EVALUATION METRICS =================")
        self.stdout.write(f"{'Model':<22} | {'MAE (points)':<14} | {'RMSE':<10} | {'R2 Score':<10}")
        self.stdout.write("-" * 65)
        for model_name, metrics in results['overall_results'].items():
            self.stdout.write(f"{model_name:<22} | {metrics['mae']:<14.3f} | {metrics['rmse']:<10.3f} | {metrics['r2']:<10.3f}")
        self.stdout.write("===================================================================\n")
