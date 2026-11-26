# Gateway API migration

`gatewayApi.mode` is `nginx` (default), `dual` (Ingress and kgateway side by side) or `kgateway`
(no Ingress). In `dual`, `gatewayApi.dnsOwner` chooses who external-dns publishes the IP of
(`nginx` by default, `kgateway` to switch the DNS). The minio, pgadmin and kibana interfaces only
follow with `gatewayApi.migrateManagement: true`. The elasticsearch Ingress stays on nginx: its backend
is HTTPS and its annotations carry the mTLS settings.

## Handing a Certificate over to the chart (`dual` to `kgateway`)

The cert-manager shim of the Ingresses creates the Certificates while the Ingresses exist. Once they are
gone (`kgateway` mode) the chart renders them itself, but Helm refuses to take over a Certificate it does
not own, and the shim's Certificates are deleted with the Ingress they belong to. Before the upgrade to
`kgateway`, detach and adopt each Certificate:

```sh
release=<release name>
namespace=<namespace>
# xtmhub-cert, plus xtmhub-cert-minio, xtmhub-cert-pgadmin and xtmhub-cert-kibana with migrateManagement
for certificate in xtmhub-cert; do
  kubectl -n "$namespace" patch certificate "$certificate" --type=json \
    -p='[{"op":"remove","path":"/metadata/ownerReferences"}]'
  kubectl -n "$namespace" label certificate "$certificate" app.kubernetes.io/managed-by=Helm --overwrite
  kubectl -n "$namespace" annotate certificate "$certificate" \
    meta.helm.sh/release-name="$release" meta.helm.sh/release-namespace="$namespace" --overwrite
done
```

The Secrets are kept, so the hosts keep their certificate during the switch.

## Certificates issued with an nginx HTTP-01 solver

The HTTP listener of the pool redirects every path to HTTPS, `/.well-known/acme-challenge/` included.
A ClusterIssuer whose solver is the nginx Ingress HTTP-01 one (`le-prod-http`) can therefore not issue
or renew the certificates of a host once its DNS is on kgateway, because the challenge reaches the gateway
instead of the solver. Every host of this chart has its own certificate: use a DNS-01 issuer for
`tls_issuer` before switching the DNS.

## www redirect

`xtmhub.wwwRedirect` is an ingress-nginx annotation. It keeps working in `dual` mode, but the chart refuses
it in `kgateway` mode: unset it first.

## Cache headers of the static assets

The gateway adds no `Cache-Control` header: the front sets its own. nginx added `Cache-Control: public`
and a one month expiry to the static assets of successful responses only, which the gateway cannot
restrict to a status.
