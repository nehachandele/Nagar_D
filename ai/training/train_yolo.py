"""
YOLOv8 Training Pipeline for Nagar Drishti (Member 3 - AI Lead)
Evaluates Precision, Recall, mAP50, mAP50-95, and Confusion Matrix.
"""
import os
import argparse

def train_model(epochs: int = 50, batch_size: int = 16, img_size: int = 640):
    try:
        from ultralytics import YOLO
    except ImportError:
        print("Ultralytics is not installed. Run: pip install ultralytics")
        return

    print("🚀 Initializing YOLOv8 Nano base model...")
    model = YOLO("yolov8n.pt")

    dataset_yaml = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset", "dataset.yaml"))
    print(f"Training on dataset: {dataset_yaml}")

    results = model.train(
        data=dataset_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        name="nagar_drishti_yolo",
        device="cpu", # Change to 0 for CUDA GPU
        plots=True,
    )

    print("📊 Evaluating model on test set...")
    metrics = model.val()
    print(f"mAP@50: {metrics.box.map50:.4f}")
    print(f"mAP@50-95: {metrics.box.map:.4f}")
    print(f"Precision: {metrics.box.mp:.4f}")
    print(f"Recall: {metrics.box.mr:.4f}")

    # Export best model
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
    os.makedirs(output_dir, exist_ok=True)
    target_path = os.path.join(output_dir, "yolov8_civic.pt")
    model.save(target_path)
    print(f"✓ Trained model saved to: {target_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8 for civic defect detection")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()
    train_model(epochs=args.epochs, batch_size=args.batch, img_size=args.imgsz)
