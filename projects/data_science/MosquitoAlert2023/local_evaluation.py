import numpy as np
import time
import os
import pandas as pd
from tqdm.auto import tqdm
from PIL import Image
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score

"""
This is only a reference script provided to allow you 
to do local evaluation. The evaluator **DOES NOT** 
use this script for orchestrating the evaluations. 
"""

from my_models.user_model import SubmissionModel

IOU_THRESHOLD = 0.75
MAX_IMAGES = 100000000000

def iou_single(w, h, bbox_gt, bbox_pred):
    # bbox format - xtl, ytl, xbr, ybr
    gt = np.zeros((w, h), dtype=np.uint8)
    pred = np.zeros((w, h), dtype=np.uint8)
    gt[bbox_gt[0]:bbox_gt[2], bbox_gt[1]:bbox_gt[3]] = 1
    pred[bbox_pred[0]:bbox_pred[2], bbox_pred[1]:bbox_pred[3]] = 1
    union = np.bitwise_or(gt, pred)
    intersection = np.bitwise_and(gt, pred)
    iou = np.sum(intersection)/(np.sum(union)+1)
    return iou

def iou_values(gt, pred):
    all_iou = []
    name_idx_map = {name: idx for name, idx in zip(pred['img_fName'], pred.index)}
    for ri, row in tqdm(gt.iterrows(), total=len(gt)):
        bbox_gt = int(row['bbx_xtl']), int(row['bbx_ytl']), int(row['bbx_xbr']), int(row['bbx_ybr'])
        prow = pred.iloc[ name_idx_map[row['img_fName']] ]
        bbox_pred = int(prow['bbx_xtl']), int(prow['bbx_ytl']), int(prow['bbx_xbr']), int(prow['bbx_ybr'])
        iou = iou_single(w=row['img_w'],  
                        h=row['img_h'],
                        bbox_gt=bbox_gt,
                        bbox_pred=bbox_pred,
        )
        all_iou.append(iou)
    return all_iou

def evaluate(config):
    print("Starting local evaluation")

    labels_df = pd.read_csv(config.labels_path)

    if config.partial_eval:
        print(
            "Warning: Selecting 5 percent of the data for eval, "
            "the underrepresented classes might have very few samples"
        )
        _, labels_df = train_test_split(labels_df, test_size=0.05, random_state=42, 
                                        stratify=labels_df['class_label'])

    model_time_elapsed = 0

    model = SubmissionModel()

    pred_dict = {
        "img_fName": [],
        "class_label": [],
        "bbx_xtl": [],
        "bbx_ytl": [],
        "bbx_xbr": [],
        "bbx_ybr": []
    }

    # Model Predictions
    for img_name in tqdm(labels_df['img_fName']):
        img_path = os.path.join(config.data_dir, img_name)
        image = np.array(Image.open(img_path))

        pred_start = time.perf_counter()
        preds = model.predict(image)
        model_time_elapsed += time.perf_counter() - pred_start

        assert len(preds) == 2, "Should be tuple of (class_label, bbox)"
        class_label, bbox = preds
        pred_dict['img_fName'].append(img_name)
        pred_dict['class_label'].append(class_label)
        pred_dict['bbx_xtl'].append(bbox[0])
        pred_dict['bbx_ytl'].append(bbox[1])
        pred_dict['bbx_xbr'].append(bbox[2])
        pred_dict['bbx_ybr'].append(bbox[3])

    preds_df = pd.DataFrame(pred_dict)

    # Scoring    
    all_iou = iou_values(labels_df, preds_df)
    iou_filtered = np.array(all_iou) < IOU_THRESHOLD
    
    classes = {name:idx  for idx, name in enumerate(list(labels_df['class_label'].unique())) }
    dummy = len(classes)
    
    gt_classes = labels_df['class_label'].map(classes).values
    pred_classes = preds_df['class_label'].map(classes).replace(np.nan, dummy).values
    pred_classes_filtered = pred_classes.copy()
    pred_classes_filtered[np.where(iou_filtered)] = dummy
    
    macro_f1 = np.mean(f1_score(y_true=gt_classes, y_pred=pred_classes_filtered, average=None)[:len(classes)])
    mean_iou = np.mean(all_iou)
    macro_f1_nofilter = np.mean(f1_score(y_true=gt_classes, y_pred=pred_classes, average=None)[:len(classes)])
    num_iou_filtered = np.sum(iou_filtered)

    results = {
        "macro_f1": float(macro_f1),
        "mean_iou": float(mean_iou),
        "macro_f1_nofilter": float(macro_f1_nofilter),
        "num_iou_filtered": int(num_iou_filtered),
    }

    print("=========================Completed=========================")

    print(f"Total time taken by model: {model_time_elapsed}s")
    print("Results", results)

if __name__ == '__main__':
    class Config:
        data_dir = './data/images/public_train/'
        labels_path = './data/labels/public_train.csv'
        partial_eval = True # Runs on 5 % of the dataset
    
    config = Config()

    evaluate(config)
