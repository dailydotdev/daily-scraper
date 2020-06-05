{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "daily-scraper.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "daily-scraper.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "daily-scraper.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "daily-scraper.checksum" }}
checksum/secret: {{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum }}
checksum/files: {{ include (print $.Template.BasePath "/secret-files.yaml") . | sha256sum }}
checksum/configmap: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
{{- end }}

{{- define "daily-scraper.config" }}
{{- $fullName := include "daily-scraper.fullname" . -}}
- name: NODE_ENV
  value: production
- name: ACCESS_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ $fullName }}
      key: ACCESS_SECRET
- name: API_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ $fullName }}
      key: API_SECRET
- name: API_URL
  valueFrom:
    configMapKeyRef:
      name: {{ $fullName }}
      key: API_URL
