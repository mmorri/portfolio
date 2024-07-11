![MosquitoAlert Banner](https://images.aicrowd.com/raw_images/challenges/social_media_image_file/1124/1c83e8678106d51ab51f.png)

# [MosquitoAlert 2023](https://www.aicrowd.com/challenges/mosquitoalert-challenge-2023) - Phase 2 - Starter Kit 
[![Discord](https://img.shields.io/discord/565639094860775436.svg)](https://discord.gg/fNRrSvZkry)

This repository is the MosquitoAlert 2023 **Submission template and Starter kit**! Clone the repository to compete now!

**This repository contains**:
*  **Documentation** on how to submit your models to the leaderboard
*  **The procedure** for best practices and information on how we evaluate your model, etc.
*  **Starter code** for you to get started!

# Table of Contents

- [MosquitoAlert 2023 - Phase 2 - Starter Kit](#mosquitoalert-2023---phase-2---starter-kit)
- [Table of Contents](#table-of-contents)
- [Competition Overview](#competition-overview)
- [Getting Started](#getting-started)
- [How to write your own model?](#how-to-write-your-own-model)
- [How to start participating?](#how-to-start-participating)
  - [Setup](#setup)
  - [How do I specify my software runtime / dependencies?](#how-do-i-specify-my-software-runtime--dependencies)
  - [What should my code structure be like?](#what-should-my-code-structure-be-like)
  - [How to make a submission?](#how-to-make-a-submission)
- [Other Concepts](#other-concepts)
    - [Evaluation Metrics](#evaluation-metrics)
    - [Time and compute constraints](#time-and-compute-constraints)
  - [Local Evaluation](#local-evaluation)
  - [Contributing](#contributing)
- [📎 Important links](#-important-links)


#  Competition Overview

The competition centred around utilising advanced computer vision techniques to detect and classify small objects. In this challenge, participants will develop cutting-edge AI solutions that precisely identify mosquitoes within images captured by citizen contributors using their mobile devices.

A diverse dataset will be provided to participants, featuring real images contributed by citizens. These images will showcase mosquitoes in various contexts, encompassing different body positions, sizes, and lighting conditions. It's important to note that the dataset exhibits an unbalanced distribution of mosquito classes, posing an additional hurdle for participants to overcome. Participants must construct robust models that handle this disparity, ensuring accurate detection and classification across all categories.

The challenge entails the development of state-of-the-art computer vision algorithms that can locate mosquitoes with pinpoint accuracy, despite their diminutive size, within the given images. Moreover, participants are tasked with classifying the detected mosquitoes into predefined categories, enabling effective mosquito surveillance and analysis.

During the competition, participants will have access to a labelled dataset for model training, focusing specifically on mosquito detection and classification. The evaluation phase will assess the performance of participants' models using a separate dataset, measuring their capabilities in terms of detection accuracy, classification precision, recall, and F1 score.


#  Getting Started
1. **Sign up** to join the competition [on the AIcrowd website](https://www.aicrowd.com/challenges/mosquitoalert-challenge-2023).
2. **Fork** this starter kit repository. You can use [this link](https://gitlab.aicrowd.com/aicrowd/challenges/mosquitoalert-challenge-2023/mosquitoalert-2023-phase2-starter-kit/-/forks/new) to create a fork.
3. **Clone** your forked repo and start developing your model.
4. **Develop** your model(s) following the template in [how to write your own model](#how-to-write-your-own-model) section.
5. [**Submit**](#how-to-make-a-submission) your trained models to [AIcrowd Gitlab](https://gitlab.aicrowd.com) for evaluation [(full instructions below)](#how-to-make-a-submission). The automated evaluation setup will evaluate the submissions on the private datasets and report the metrics on the leaderboard of the competition.

# How to write your own model?

We recommend that you place the code for all your models in the `my_models/` directory (though it is not mandatory). You should implement the following

- `predict` - This function is called to get the classification labels and bouding boxes for each image.

**Add your model name in** `my_models/user_model.py`, this is what will be used for the evaluations.
  
An example are provided in `my_models/random_model.py`

# How to start participating?

## Setup

1. **Add your SSH key** to AIcrowd GitLab

You can add your SSH Keys to your GitLab account by going to your profile settings [here](https://gitlab.aicrowd.com/profile/keys). If you do not have SSH Keys, you will first need to [generate one](https://docs.gitlab.com/ee/ssh/README.html#generating-a-new-ssh-key-pair).

2. **Fork the repository**. You can use [this link](https://gitlab.aicrowd.com/aicrowd/challenges/mosquitoalert-challenge-2023/mosquitoalert-2023-phase2-starter-kit/-/forks/new) to create a fork.

2.  **Clone the repository**

    ```
    git clone git@gitlab.aicrowd.com:aicrowd/challenges/mosquitoalert-challenge-2023/mosquitoalert-2023-phase2-starter-kit.git
    ```

3. **Install** competition specific dependencies!
    ```
    cd mosquitoalert-2023-phase2-starter-kit
    pip install -r requirements.txt
    ```

4. Write your own model as described in [How to write your own model](#how-to-write-your-own-model) section.

5. Test your model locally using `python local_evaluation.py`

6. Make a submission as described in [How to make a submission](#how-to-make-a-submission) section.

## How do I specify my software runtime / dependencies?

We accept submissions with custom runtime, so you don't need to worry about which libraries or framework to pick from.

The configuration files typically include `requirements.txt` (pypi packages), `apt.txt` (apt packages) or even your own `Dockerfile`.

You can check detailed information about the same in the 👉 [runtime.md](docs/runtime.md) file.

## What should my code structure be like?

Please follow the example structure as it is in the starter kit for the code structure.
The different files and directories have following meaning:

```
.
├── aicrowd.json           # Submission meta information - like your username
├── apt.txt                # Linux packages to be installed inside docker image
├── requirements.txt       # Python packages to be installed
├── local_evaluation.py    # Use this to check your model evaluation flow locally
└── my_models              # Place your models related code here
    ├── random_model.py            # Random model for interface example
    └── user_model.py              # IMPORTANT: Add your model name here
```

Finally, **you must specify an AIcrowd submission JSON in `aicrowd.json` to be scored!**

The `aicrowd.json` of each submission should contain the following content:

```json
{
  "challenge_id": "mosquitoalert-challenge-2023",
  "authors": ["your-aicrowd-username"],
  "description": "(optional) description about your awesome model",
}
```

This JSON is used to map your submission to the challenge - so please remember to use the correct `challenge_id` as specified above.

## How to make a submission?

👉 [submission.md](/docs/submission.md)

**Best of Luck** :tada: :tada:

# Other Concepts
### Evaluation Metrics


### Time and compute constraints

Your model needs to predict of each image in `1 second`. For compute, you will be provided a virutal machine with `2 CPU cores and 12 GB of RAM`.

## Local Evaluation

Participants can run the evaluation protocol for their model locally with or without any constraint posed by the Challenge to benchmark their models privately. See `local_evaluation.py` for details. You can change it as you like, it will not be used for the competition. 

## Contributing

🙏 You can share your solutions or any other baselines by contributing directly to this repository by opening merge request.

- Add your implemntation as `my_models/<your_model>.py`.
- Import it in `user_model.py`
- Test it out using `python local_evaluation.py`.
- Add any documentation for your approach at top of your file.
- Create merge request! 🎉🎉🎉 

# 📎 Important links

- 💪 Challenge Page: https://www.aicrowd.com/challenges/mosquitoalert-challenge-2023

- 🗣 Discussion Forum: https://discourse.aicrowd.com/c/mosquitoalert-challenge-2023

- 🏆 Leaderboard: https://www.aicrowd.com/challenges/mosquitoalert-challenge-2023/leaderboards
