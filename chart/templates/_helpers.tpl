{{- /* Anything but dual or kgateway (unset, "nginx", a typo) is nginx. */ -}}
{{- define "gatewayApi.mode" -}}
{{- $mode := (.Values.gatewayApi).mode | default "nginx" -}}
{{- if has $mode (list "dual" "kgateway") -}}{{ $mode }}{{- else -}}nginx{{- end -}}
{{- end }}

{{- /* The gateway objects (ListenerSet, HTTPRoutes, policies) are rendered. Returns "true" or "". */ -}}
{{- define "gatewayApi.enabled" -}}
{{- if ne (include "gatewayApi.mode" .) "nginx" -}}true{{- end -}}
{{- end }}

{{- /* The nginx Ingresses are rendered. Returns "true" or "". */ -}}
{{- define "gatewayApi.ingressEnabled" -}}
{{- if ne (include "gatewayApi.mode" .) "kgateway" -}}true{{- end -}}
{{- end }}

{{- /*
external-dns publishes the gateway IP: always in kgateway mode, and in dual mode only once
gatewayApi.dnsOwner is set to kgateway (manual switch). Anything else stays on nginx.
Returns "true" or "".
*/ -}}
{{- define "gatewayApi.dnsOnGateway" -}}
{{- $mode := include "gatewayApi.mode" . -}}
{{- if or (eq $mode "kgateway") (and (eq $mode "dual") (eq ((.Values.gatewayApi).dnsOwner | default "nginx") "kgateway")) -}}true{{- end -}}
{{- end }}

{{- /*
Rejects the settings the gateway path cannot honour yet, instead of silently dropping a redirect or an
access control at cutover. Input: root.
*/ -}}
{{- define "gatewayApi.validate" -}}
{{- if and (include "gatewayApi.dnsOnGateway" .) .Values.xtmhub.wwwRedirect -}}
{{- fail "xtmhub.wwwRedirect relies on ingress-nginx and is not supported while DNS is on kgateway: unset it" -}}
{{- end -}}
{{- if and .Values.gatewayApi.migrateManagement .Values.kibana.enabled .Values.kibana.ingress.enabled -}}
{{- range $key, $_ := (.Values.kibana.ingress.annotations | default dict) -}}
{{- if hasPrefix "nginx.ingress.kubernetes.io/auth-" $key -}}
{{- fail (printf "the annotation %s of kibana.ingress has no equivalent in gatewayApi mode: the authentication would be dropped at cutover" $key) -}}
{{- end -}}
{{- if eq $key "nginx.ingress.kubernetes.io/denylist-source-range" -}}
{{- fail "the annotation nginx.ingress.kubernetes.io/denylist-source-range of kibana.ingress is not read in gatewayApi mode: the kibana whitelist would let the denied subnets through" -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- end }}

{{- /*
Annotations set by the user on an Ingress. The external-dns controller one is dropped when the chart
already sets it to ignore, so that the generated value wins and the key is not emitted twice.
Input: dict "annotations" (the user map) "ignored" (the chart sets controller: ignore).
*/ -}}
{{- define "gatewayApi.customAnnotations" -}}
{{- $annotations := .annotations -}}
{{- if .ignored -}}
{{- $annotations = omit $annotations "external-dns.alpha.kubernetes.io/controller" -}}
{{- end -}}
{{- if $annotations -}}
{{- toYaml $annotations -}}
{{- end -}}
{{- end }}
