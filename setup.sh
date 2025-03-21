#!/bin/bash

export GOOGLE_APPLICATION_CREDENTIALS=cred.json

gcloud auth login --cred-file=$GOOGLE_APPLICATION_CREDENTIALS
